import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Copy, Trash2, RefreshCw, Zap, Sparkles } from 'lucide-react'
import { useWsStore } from '../hooks/useWs'
import Editor from '@monaco-editor/react'
import { toast } from 'sonner'
import RealtimeClientServerLogsTable from './realtime-client-server-logs-table'

const TEMPLATES = [
  {
    name: 'Standard JSON',
    payload: `{\n  "action": "greeting",\n  "message": "Hello WebSocket from PostBoy!",\n  "timestamp": "${new Date().toISOString()}"\n}`
  },
  {
    name: 'Ping Frame',
    payload: `{\n  "type": "ping",\n  "id": "${Math.random().toString(36).slice(2, 8)}"\n}`
  },
  {
    name: 'Event Subscription',
    payload: `{\n  "event": "subscribe",\n  "channel": "orders",\n  "auth": "token-xyz"\n}`
  }
]

const RealtimeMessageEditor = () => {
  const { 
    send, 
    status,
    isConnected, 
    isMock,
    draftMessage, 
    setDraftMessage, 
  } = useWsStore()
  
  const [isSending, setIsSending] = useState(false)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)

  useEffect(() => {
    if (!draftMessage) {
      setDraftMessage(TEMPLATES[0].payload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!isConnected) {
      toast.info('WebSocket is not connected! Please connect above first.')
      return
    }

    if (!draftMessage || !draftMessage.trim()) {
      toast.info('Please enter a message to send!')
      return
    }

    try {
      setIsSending(true)
      
      let messageToSend: any
      try {
        messageToSend = JSON.parse(draftMessage)
      } catch {
        // If not valid JSON, send as plain text/raw string
        messageToSend = draftMessage
      }

      const success = send(messageToSend)
      if (success) {
        toast.success(isMock ? 'Mock message sent (Echo received below)' : 'Message sent to WebSocket server')
      } else {
        toast.error('Failed to send message. Connection may have dropped.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error sending message: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsSending(false)
    }
  }, [draftMessage, send, isConnected, isMock])

  // Initialize Monaco Editor
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: true
    })

    editor.updateOptions({
      theme: 'vs-dark',
      fontSize: 13,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      formatOnPaste: true,
      formatOnType: true
    })

    // Keyboard shortcut (Ctrl+Enter / Cmd+Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleSendMessage()
    })
  }, [handleSendMessage])

  const handleFormatJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(draftMessage)
      const formatted = JSON.stringify(parsed, null, 2)
      setDraftMessage(formatted)
      if (editorRef.current) {
        editorRef.current.setValue(formatted)
      }
    } catch {
      toast.error('Invalid JSON format cannot be formatted')
    }
  }, [draftMessage, setDraftMessage])

  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(draftMessage)
      .then(() => {
        toast.success('Message copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy message:', err)
      })
  }, [draftMessage])

  const handleClearMessage = useCallback(() => {
    const emptyMessage = '{\n  \n}'
    setDraftMessage(emptyMessage)
    if (editorRef.current) {
      editorRef.current.setValue(emptyMessage)
      editorRef.current.focus()
    }
  }, [setDraftMessage])

  const applyTemplate = (payload: string) => {
    setDraftMessage(payload)
    if (editorRef.current) {
      editorRef.current.setValue(payload)
      editorRef.current.focus()
    }
  }

  return (
    <div className="flex flex-col space-y-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">Message Composer</h3>
          {isMock && (
            <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <Sparkles size={11} /> Mock Echo Mode
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Templates */}
          <div className="hidden sm:flex items-center gap-1 mr-2">
            <span className="text-[11px] text-zinc-500">Templates:</span>
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                type="button"
                onClick={() => applyTemplate(tpl.payload)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
              >
                {tpl.name}
              </button>
            ))}
          </div>

          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isConnected 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Editor Box */}
      <div className="relative">
        <div className="border border-zinc-700/80 rounded-lg overflow-hidden bg-zinc-950">
          <Editor
            height="140px"
            language="json"
            theme="vs-dark"
            value={draftMessage}
            onChange={(value) => setDraftMessage(value || '')}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              lineNumbers: 'on',
              renderWhitespace: 'boundary',
            }}
            loading={
              <div className="w-full h-36 bg-zinc-950 flex items-center justify-center">
                <div className="text-zinc-500 text-sm">Loading Editor...</div>
              </div>
            }
          />
        </div>
        
        {/* Editor Floating Actions */}
        <div className="absolute top-2 right-2 flex gap-1 bg-zinc-900/90 border border-zinc-700/80 rounded-md p-0.5 shadow">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFormatJSON}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Format JSON"
          >
            <RefreshCw size={12} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyMessage}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Copy Message"
          >
            <Copy size={12} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearMessage}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
            title="Clear"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {/* Send Row */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="text-xs text-zinc-400 flex items-center gap-1.5">
          <Zap size={13} className="text-amber-400" />
          <span>Press <strong>Ctrl + Enter</strong> to send</span>
        </div>

        <Button
          onClick={handleSendMessage}
          disabled={!isConnected || isSending}
          className={`font-semibold px-4 transition-all shadow-sm ${
            isConnected
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
          }`}
        >
          <Send size={15} className="mr-2" />
          {isSending ? 'Sending...' : 'Send Message'}
        </Button>
      </div>

      {/* Logs Table */}
      <div className="pt-2 flex-1 min-h-[300px]">
        <RealtimeClientServerLogsTable />
      </div>
    </div>
  )
}

export default RealtimeMessageEditor