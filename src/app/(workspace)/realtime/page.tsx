"use client";

import RealtimeConnectionBar from '@/modules/realtime/components/realtime-connection-bar'
import RealtimeMessageEditor from '@/modules/realtime/components/realtime-message-editor'
import React from 'react'

const RealtimePage = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-5 pb-3 space-y-2.5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            WebSocket Client
          </h1>
          <p className="text-sm text-zinc-400">
            Connect to any live WebSocket endpoint or use the built-in Mock Echo to test bidirectional messaging.
          </p>
        </div>
        <RealtimeConnectionBar />
      </div>
      <div className="flex-1 px-6 pb-6 flex flex-col min-h-0">
        <RealtimeMessageEditor />
      </div>
    </div>
  )
}

export default RealtimePage