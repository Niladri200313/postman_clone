import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlugZap, Plug, AlertCircle, XCircle, Sparkles, Globe, Radio } from 'lucide-react'
import React, { useState, useCallback, useEffect } from 'react'
import { useWsStore } from '../hooks/useWs'

const PRESETS = [
  {
    name: '⚡ Mock Echo (Offline)',
    url: 'mock://echo',
    desc: 'Instant internal mock server, works without internet or setup'
  },
  {
    name: '🌐 WebSocket.org',
    url: 'wss://echo.websocket.org',
    desc: 'Public echo server hosted by websocket.org'
  },
  {
    name: '🚀 Postman Echo',
    url: 'wss://ws.postman-echo.com/raw',
    desc: 'Official Postman public WebSocket echo endpoint'
  }
]

const RealtimeConnectionBar = () => {
  const { 
    status, 
    isConnected, 
    isConnecting,
    isReconnecting,
    isMock,
    error, 
    url: connectedUrl, 
    reconnectAttempts, 
    maxReconnectAttempts,
    connect,
    disconnect
  } = useWsStore()
  
  const [url, setUrl] = useState(connectedUrl || 'mock://echo')

  // Keep local input in sync when connectedUrl changes
  useEffect(() => {
    if (connectedUrl) {
      setUrl(connectedUrl)
    }
  }, [connectedUrl])

  const handleConnectToggle = useCallback(() => {
    if (isConnected || isConnecting || isReconnecting) {
      // Disconnect or abort ongoing connection/reconnection
      disconnect()
      return
    }

    if (!url.trim()) {
      alert('Please enter a WebSocket URL')
      return
    }

    connect(url, {
      autoReconnect: true,
      reconnectDelay: 2500
    })
  }, [url, isConnected, isConnecting, isReconnecting, connect, disconnect])

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConnectToggle()
    }
  }, [handleConnectToggle])

  const applyPreset = (presetUrl: string) => {
    setUrl(presetUrl)
    if (isConnected || isConnecting || isReconnecting) {
      disconnect()
    }
  }

  const getConnectionColor = () => {
    if (isConnected) {
      return 'bg-red-600 hover:bg-red-700 text-white'
    }
    if (isConnecting || isReconnecting) {
      return 'bg-amber-600 hover:bg-amber-700 text-white'
    }
    if (status === 'error') {
      return 'bg-rose-600 hover:bg-rose-700 text-white'
    }
    return 'bg-emerald-600 hover:bg-emerald-700 text-white'
  }

  const getConnectionIcon = () => {
    if (isConnected) {
      return <Plug size={16} />
    }
    if (isConnecting || isReconnecting) {
      return <XCircle size={16} className="animate-spin" />
    }
    if (status === 'error') {
      return <AlertCircle size={16} />
    }
    return <PlugZap size={16} />
  }

  const getButtonText = () => {
    if (isConnected) {
      return 'Disconnect'
    }
    if (isConnecting) {
      return 'Cancel'
    }
    if (isReconnecting) {
      return `Cancel (${reconnectAttempts}/${maxReconnectAttempts})`
    }
    if (status === 'error') {
      return 'Retry Connect'
    }
    return 'Connect'
  }

  return (
    <div className="flex flex-col gap-2.5 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      {/* Main Connection Row */}
      <div className="flex flex-row items-center gap-2 w-full">
        <div className="relative flex-1">
          <Input 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter WebSocket URL (e.g. mock://echo or wss://echo.websocket.org)"
            className="w-full bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 font-mono text-sm pr-24"
          />
          {isMock && isConnected && (
            <span className="absolute right-3 top-2.5 text-[11px] font-medium bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={11} /> Mock Active
            </span>
          )}
        </div>

        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2 text-xs">
          <div 
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
              isConnecting || isReconnecting ? 'bg-amber-400 animate-pulse' :
              status === 'error' ? 'bg-rose-500' : 'bg-zinc-600'
            }`}
          />
          <span className="capitalize text-zinc-300 font-medium">
            {isReconnecting ? `Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})` : status}
          </span>
        </div>

        {/* Action Button: Never locked, can always disconnect or cancel */}
        <Button
          type="button"
          onClick={handleConnectToggle}
          className={`font-semibold text-sm transition-all duration-150 min-w-[120px] shadow-sm ${getConnectionColor()}`}
        >
          <span className="flex items-center gap-1.5">
            {getConnectionIcon()}
            {getButtonText()}
          </span>
        </Button>
      </div>

      {/* Quick Presets Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
          <Radio size={12} /> Presets:
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset.url}
            type="button"
            onClick={() => applyPreset(preset.url)}
            title={preset.desc}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
              url === preset.url
                ? 'bg-zinc-800 border-zinc-600 text-white font-medium shadow-sm'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Error Banner if error exists */}
      {error && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-md flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertCircle size={14} />
            {error}
          </span>
          <button
            type="button"
            onClick={() => disconnect()}
            className="text-[11px] text-rose-300 hover:underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

export default RealtimeConnectionBar

