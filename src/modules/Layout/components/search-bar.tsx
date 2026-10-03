"use client"
import { Search } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

import { useRequestPlaygroundStore } from "@/modules/request/store/useRequestStore";
import { useRouter } from "next/navigation";
import { Plus, Globe, Link as LinkIcon } from "lucide-react";

const SearchBar = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { tabs, setActiveTab, addTab } = useRequestPlaygroundStore();

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      {/* Search Button */}
      <button 
        onClick={() => setOpen(true)}
        className="relative flex flex-1 cursor-text items-center justify-between self-stretch rounded bg-zinc-900 px-4 py-2 text-gray-500 transition hover:bg-zinc-800 hover:text-gray-200 focus-visible:bg-zinc-700 focus-visible:text-gray-200 overflow-hidden"
      >
        <span className="inline-flex flex-1 items-center">
          <Search size={16} className="mr-2 text-indigo-400" />
          <span className="text-xs text-left">Search or run command...</span>
        </span>
        <span className="flex space-x-1">
          <kbd className="px-1 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">Ctrl</kbd>
          <kbd className="px-1 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">K</kbd>
        </span>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="bg-zinc-900 border border-zinc-800">
          <CommandInput 
            placeholder="Type a command, page, or request tab..." 
            className="bg-transparent border-none text-gray-300 placeholder:text-gray-500"
          />
          <CommandList className="bg-zinc-900">
            <CommandEmpty className="text-gray-500 py-6 text-center text-xs">No matching results found.</CommandEmpty>

            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  addTab();
                  router.push("/");
                  setOpen(false);
                }}
                className="text-gray-300 hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
              >
                <Plus size={14} className="text-indigo-400" />
                <span>New HTTP Request</span>
                <CommandShortcut>Ctrl+Shift+N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  router.push("/");
                  setOpen(false);
                }}
                className="text-gray-300 hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
              >
                <LinkIcon size={14} className="text-blue-400" />
                <span>Go to REST Playground</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  router.push("/realtime");
                  setOpen(false);
                }}
                className="text-gray-300 hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
              >
                <Globe size={14} className="text-emerald-400" />
                <span>Go to WebSocket Client</span>
              </CommandItem>
            </CommandGroup>

            {tabs.length > 0 && (
              <CommandGroup heading="Open Tabs">
                {tabs.map((tab) => (
                  <CommandItem
                    key={tab.id}
                    onSelect={() => {
                      setActiveTab(tab.id);
                      router.push("/");
                      setOpen(false);
                    }}
                    className="text-gray-300 hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono font-semibold px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {tab.method}
                      </span>
                      <span className="truncate text-xs">{tab.title}</span>
                    </div>
                    {tab.url && (
                      <span className="text-[11px] text-zinc-500 truncate max-w-[200px] font-mono">
                        {tab.url}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          
          {/* Bottom navigation hints */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800 bg-zinc-900">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-gray-400 rounded text-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-gray-400 rounded text-xs">↓</kbd>
                <span>to navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-gray-400 rounded text-xs">↵</kbd>
                <span>to select</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 text-gray-400 rounded text-xs">ESC</kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  )
}

export default SearchBar