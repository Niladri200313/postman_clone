import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

export type WsMessage = {
  id: string
  type: 'sent' | 'received'
  data: any
  timestamp: Date | string
  raw?: string
}

export type WsOptions = {
  onOpen?: (ev: Event) => void
  onMessage?: (ev: MessageEvent) => void
  onClose?: (ev: CloseEvent) => void
  onError?: (ev: Event | Error) => void
  autoReconnect?: boolean
  reconnectDelay?: number
}

interface WsStore {
  // Connection state
  ws: WebSocket | null
  url: string | null
  status: ConnectionStatus
  error: string | null
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  isMock: boolean

  // Messages
  messages: WsMessage[]

  // Connection options
  options: WsOptions

  // Reconnection state
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectTimeoutId: any | null
  mockTimerId: any | null

  // Editor draft (persist editor content globally)
  draftMessage: string

  // Actions
  connect: (url: string, options?: WsOptions) => void
  disconnect: (code?: number, reason?: string) => void
  send: (data: string | object) => boolean
  clearMessages: () => void
  setError: (error: string | null) => void
  setDraftMessage: (message: string) => void

  // Internal actions
  setStatus: (status: ConnectionStatus) => void
  addMessage: (message: Omit<WsMessage, 'id' | 'timestamp'> & { timestamp?: Date | string }) => void
  handleReconnect: () => void
  getReadyState: () => number
}

// Normalize URL to valid ws:// or wss:// or mock://
export const normalizeWsUrl = (input: string): string => {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (trimmed === 'mock://echo' || trimmed === 'ws://echo.mock' || trimmed === 'echo.mock') {
    return 'mock://echo'
  }
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://') || trimmed.startsWith('mock://')) {
    return trimmed
  }
  if (trimmed.startsWith('https://')) {
    return 'wss://' + trimmed.slice(8)
  }
  if (trimmed.startsWith('http://')) {
    return 'ws://' + trimmed.slice(7)
  }
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    return `ws://${trimmed}`
  }
  return `wss://${trimmed}`
}

// Initial state
const getInitialState = () => ({
  ws: null as WebSocket | null,
  url: null as string | null,
  status: 'disconnected' as ConnectionStatus,
  error: null as string | null,
  isConnected: false,
  isConnecting: false,
  isReconnecting: false,
  isMock: false,
  messages: [] as WsMessage[],
  draftMessage: '',
  options: {} as WsOptions,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectTimeoutId: null as any,
  mockTimerId: null as any,
})

export const useWsStore = create<WsStore>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialState(),

    // Connect action
    connect: (rawUrl: string, options: WsOptions = {}) => {
      const state = get()

      // Disconnect existing connection cleanly
      if (state.reconnectTimeoutId) {
        clearTimeout(state.reconnectTimeoutId)
      }
      if (state.mockTimerId) {
        clearTimeout(state.mockTimerId)
      }
      if (state.ws) {
        state.ws.onclose = null
        state.ws.onerror = null
        state.ws.onmessage = null
        state.ws.onopen = null
        try {
          state.ws.close(1000, 'Reconnecting')
        } catch {
          // ignore
        }
      }

      const url = normalizeWsUrl(rawUrl)
      if (!url) {
        set({
          status: 'error',
          error: 'Please enter a valid WebSocket URL',
          isConnected: false,
          isConnecting: false,
          isReconnecting: false,
        })
        return
      }

      const isMock = url === 'mock://echo' || url.startsWith('mock://')

      set({
        url,
        options,
        status: 'connecting',
        isConnected: false,
        isConnecting: true,
        isReconnecting: false,
        isMock,
        error: null,
        reconnectAttempts: 0,
        reconnectTimeoutId: null,
      })

      // MOCK SERVER MODE: Instant offline simulated WebSocket
      if (isMock) {
        console.log('[Mock WS] Connecting to simulated mock WebSocket:', url)
        const mockTimer = setTimeout(() => {
          set({
            status: 'connected',
            isConnected: true,
            isConnecting: false,
            isReconnecting: false,
            error: null,
            mockTimerId: null,
          })

          get().addMessage({
            type: 'received',
            data: {
              status: 'connected',
              server: 'PostBoy Mock WebSocket Server (Built-in)',
              url,
              time: new Date().toISOString(),
              message: 'Connected to internal mock echo server! All messages sent will be automatically echoed back.',
            },
            raw: JSON.stringify({
              status: 'connected',
              server: 'PostBoy Mock WebSocket Server (Built-in)',
              url,
              message: 'Connected to internal mock echo server!',
            }),
          })

          options.onOpen?.(new Event('open'))
        }, 200)

        set({ mockTimerId: mockTimer })
        return
      }

      // REAL WEBSOCKET MODE
      try {
        const ws = new WebSocket(url)

        ws.onopen = (event) => {
          console.log('[WS] Connected to:', url)
          set({
            ws,
            status: 'connected',
            isConnected: true,
            isConnecting: false,
            isReconnecting: false,
            error: null,
            reconnectAttempts: 0,
          })
          options.onOpen?.(event)
        }

        ws.onmessage = async (event) => {
          let payload = event.data

          // Handle Blob / binary data
          if (payload instanceof Blob) {
            try {
              payload = await payload.text()
            } catch (err) {
              console.error('Failed to parse Blob WebSocket message:', err)
            }
          }

          let parsed = payload
          try {
            parsed = JSON.parse(payload)
          } catch {
            // keep as string
          }

          console.log('[WS] Message received:', payload)
          get().addMessage({
            type: 'received',
            data: parsed,
            raw: typeof payload === 'string' ? payload : JSON.stringify(payload),
          })

          options.onMessage?.(event)
        }

        ws.onclose = (event) => {
          console.log('[WS] Closed:', event.code, event.reason)
          const currentOptions = get().options

          set({
            ws: null,
            isConnected: false,
            isConnecting: false,
          })

          options.onClose?.(event)

          // Auto-reconnect only on abnormal close (not user code 1000)
          if (currentOptions.autoReconnect && event.code !== 1000 && event.code !== 1005) {
            get().handleReconnect()
          } else {
            set({
              status: 'disconnected',
              isReconnecting: false,
            })
          }
        }

        ws.onerror = (event) => {
          console.error('[WS] Error:', event)
          set({
            status: 'error',
            isConnected: false,
            isConnecting: false,
            error: 'WebSocket connection failed. Ensure the server is running and accessible.',
          })
          options.onError?.(event)
        }
      } catch (error) {
        console.error('[WS] Failed to construct WebSocket:', error)
        set({
          status: 'error',
          isConnected: false,
          isConnecting: false,
          isReconnecting: false,
          error: error instanceof Error ? error.message : 'Invalid WebSocket URL or failed to connect',
        })
        options.onError?.(error as Error)
      }
    },

    // Disconnect action
    disconnect: (code = 1000, reason = 'User disconnected') => {
      const state = get()

      if (state.reconnectTimeoutId) {
        clearTimeout(state.reconnectTimeoutId)
      }
      if (state.mockTimerId) {
        clearTimeout(state.mockTimerId)
      }

      if (state.ws) {
        state.ws.onclose = null
        state.ws.onerror = null
        state.ws.onmessage = null
        state.ws.onopen = null
        try {
          state.ws.close(code, reason)
        } catch {
          // ignore
        }
      }

      set({
        ws: null,
        status: 'disconnected',
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        reconnectTimeoutId: null,
        mockTimerId: null,
        reconnectAttempts: 0,
        error: null,
      })
    },

    // Send message action
    send: (data: string | object) => {
      const state = get()

      if (state.status !== 'connected') {
        console.warn('[WS] Cannot send message, WebSocket is not connected')
        return false
      }

      const rawString = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      let parsed = data
      if (typeof data === 'string') {
        try {
          parsed = JSON.parse(data)
        } catch {
          parsed = data
        }
      }

      // Add to sent messages history
      get().addMessage({
        type: 'sent',
        data: parsed,
        raw: rawString,
      })

      // MOCK ECHO MODE: Simulate server reply
      if (state.isMock) {
        setTimeout(() => {
          let echoReply: any
          if (typeof parsed === 'object' && parsed !== null) {
            echoReply = {
              echo: true,
              received: parsed,
              serverTime: new Date().toISOString(),
              mockMessage: 'Echo response from PostBoy Mock Server',
            }
          } else if (String(parsed).toLowerCase().trim() === 'ping') {
            echoReply = 'pong'
          } else {
            echoReply = `Echo: ${parsed}`
          }

          get().addMessage({
            type: 'received',
            data: echoReply,
            raw: typeof echoReply === 'string' ? echoReply : JSON.stringify(echoReply, null, 2),
          })
        }, 120)

        return true
      }

      // REAL WEBSOCKET MODE
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        console.warn('[WS] WebSocket readyState is not OPEN')
        return false
      }

      try {
        const payloadToSend = typeof data === 'string' ? data : JSON.stringify(data)
        state.ws.send(payloadToSend)
        console.log('[WS] Message sent:', payloadToSend)
        return true
      } catch (error) {
        console.error('[WS] Failed to send message:', error)
        set({ error: 'Failed to send message' })
        return false
      }
    },

    // Clear messages
    clearMessages: () => set({ messages: [] }),

    // Draft message (editor)
    setDraftMessage: (message: string) => set({ draftMessage: message }),

    // Set error
    setError: (error: string | null) => set({ error }),

    // Set status (internal)
    setStatus: (status: ConnectionStatus) =>
      set({
        status,
        isConnected: status === 'connected',
        isConnecting: status === 'connecting',
        isReconnecting: status === 'reconnecting',
      }),

    // Add message (internal)
    addMessage: (message) => {
      const newMessage: WsMessage = {
        ...message,
        id: crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      }

      set((state) => ({
        messages: [...state.messages, newMessage].slice(-200), // Keep last 200 messages
      }))
    },

    // Handle reconnection (internal)
    handleReconnect: () => {
      const state = get()

      if (state.reconnectAttempts >= state.maxReconnectAttempts) {
        console.log('[WS] Max reconnection attempts reached')
        set({
          status: 'error',
          isConnected: false,
          isConnecting: false,
          isReconnecting: false,
          error: 'Connection closed. Max reconnection attempts reached.',
        })
        return
      }

      const nextAttempt = state.reconnectAttempts + 1
      const delay = Math.min((state.options.reconnectDelay || 2000) * Math.pow(1.5, state.reconnectAttempts), 10000)

      set({
        status: 'reconnecting',
        isConnected: false,
        isConnecting: false,
        isReconnecting: true,
        reconnectAttempts: nextAttempt,
      })

      console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${nextAttempt}/${state.maxReconnectAttempts})`)

      const timeoutId = setTimeout(() => {
        const currentState = get()
        if (currentState.url && currentState.status === 'reconnecting') {
          currentState.connect(currentState.url, currentState.options)
        }
      }, delay)

      set({ reconnectTimeoutId: timeoutId })
    },

    // Get WebSocket ready state
    getReadyState: () => {
      const ws = get().ws
      return ws ? ws.readyState : WebSocket.CLOSED
    },
  }))
)