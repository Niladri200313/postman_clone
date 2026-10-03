import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useWsStore, WsMessage } from '../hooks/useWs'
import { ChevronUp, ChevronDown, Trash2, Copy, Clock, ArrowUpRight, ArrowDownLeft, Check, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const RealtimeClientServerLogsTable = () => {
  const { messages, clearMessages } = useWsStore()
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(-1)
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages
    return messages.filter(m => m.type === filter)
  }, [messages, filter])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (filteredMessages.length > 0 && selectedMessageIndex === -1) {
      if (tableRef.current) {
        tableRef.current.scrollTop = tableRef.current.scrollHeight
      }
    }
  }, [filteredMessages.length, selectedMessageIndex])

  // Keep row refs array clean
  useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, filteredMessages.length)
  }, [filteredMessages.length])

  const scrollToRow = (index: number) => {
    const row = rowRefs.current[index]
    if (row && tableRef.current) {
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const handleNavigateUp = () => {
    if (filteredMessages.length === 0) return
    const newIndex = selectedMessageIndex <= 0 ? filteredMessages.length - 1 : selectedMessageIndex - 1
    setSelectedMessageIndex(newIndex)
    scrollToRow(newIndex)
  }

  const handleNavigateDown = () => {
    if (filteredMessages.length === 0) return
    const newIndex = selectedMessageIndex === -1 || selectedMessageIndex >= filteredMessages.length - 1 ? 0 : selectedMessageIndex + 1
    setSelectedMessageIndex(newIndex)
    scrollToRow(newIndex)
  }

  const handleRowClick = (index: number) => {
    setSelectedMessageIndex(selectedMessageIndex === index ? -1 : index)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      toast.success('Message payload copied')
      setTimeout(() => setCopiedId(null), 1500)
    }).catch(err => {
      console.error('Failed to copy: ', err)
      toast.error('Failed to copy')
    })
  }

  const formatTimestamp = (timestamp: Date | string | number | undefined) => {
    if (!timestamp) return ''
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      if (isNaN(date.getTime())) return String(timestamp)
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        hour12: false
      }).format(date)
    } catch {
      return String(timestamp)
    }
  }

  const formatMessageData = (data: any) => {
    if (data === null || data === undefined) return ''
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2)
      } catch {
        return data
      }
    }
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/60 gap-2">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-zinc-400" />
          <h4 className="text-sm text-white font-medium">Live Activity Stream</h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            {filteredMessages.length} msg{filteredMessages.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-md border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('sent')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'sent' ? 'bg-blue-600/30 text-blue-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sent
          </button>
          <button
            type="button"
            onClick={() => setFilter('received')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'received' ? 'bg-emerald-600/30 text-emerald-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Received
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Navigation arrows */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateUp}
            disabled={filteredMessages.length === 0}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Previous message"
          >
            <ChevronUp size={14} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateDown}
            disabled={filteredMessages.length === 0}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Next message"
          >
            <ChevronDown size={14} />
          </Button>

          <div className="w-px h-4 bg-zinc-800 mx-1" />

          {/* Clear messages */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={messages.length === 0}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
            title="Clear all messages"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div ref={tableRef} className="flex-1 max-h-[360px] overflow-y-auto p-2 space-y-1.5 scroll-smooth font-sans">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-xs gap-1.5">
            <Clock size={24} className="text-zinc-600 mb-1" />
            <span>No messages yet.</span>
            <span className="text-[11px] text-zinc-600">Connect to a WebSocket server above and send a message.</span>
          </div>
        ) : (
          filteredMessages.map((message: WsMessage, index: number) => {
            const isSelected = selectedMessageIndex === index
            const isSent = message.type === 'sent'
            const formatted = formatMessageData(message.data)

            return (
              <div
                key={message.id}
                ref={(el) => { rowRefs.current[index] = el }}
                onClick={() => handleRowClick(index)}
                className={`
                  border-l-2 rounded-md p-2.5 cursor-pointer transition-all duration-150 text-xs
                  ${isSent ? 'border-l-blue-500 bg-blue-950/20' : 'border-l-emerald-500 bg-emerald-950/20'}
                  ${isSelected ? 'ring-1 ring-zinc-500 bg-zinc-900' : 'hover:bg-zinc-900/60'}
                `}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {isSent ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        <ArrowUpRight size={13} /> SENT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <ArrowDownLeft size={13} /> RECEIVED
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 font-mono">#{index + 1}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(message.raw || formatted, message.id)
                      }}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                      title="Copy payload"
                    >
                      {copiedId === message.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                <div className="font-mono text-zinc-300 bg-zinc-950/80 rounded p-2 border border-zinc-800/80 overflow-x-auto">
                  {isSelected ? (
                    <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">
                      {formatted}
                    </pre>
                  ) : (
                    <div className="truncate text-[11px] text-zinc-400">
                      {typeof message.data === 'string' ? message.data : JSON.stringify(message.data)}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Info */}
      {selectedMessageIndex >= 0 && (
        <div className="px-3 py-1.5 border-t border-zinc-800 text-[11px] text-zinc-400 bg-zinc-900/50 flex items-center justify-between">
          <span>Selected #{selectedMessageIndex + 1} of {filteredMessages.length}</span>
          <span className="text-zinc-500">Click row again to collapse</span>
        </div>
      )}
    </div>
  )
}

export default RealtimeClientServerLogsTable