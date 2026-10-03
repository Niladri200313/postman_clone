"use client";

import { useHotkeys } from "react-hotkeys-hook";
import RequestEditor from "./request-editor";
import TabBar from "./tab-bar";
import { useRequestPlaygroundStore } from "../store/useRequestStore";
import { useState } from "react";
import { toast } from "sonner";
import SaveRequestToCollectionModal from "@/modules/collections/components/add-request-modal";
import { REST_METHOD } from "@prisma/client";

import { Unplug, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaveRequest } from "../hooks/request";

export default function PlaygroundPage() {
  const { tabs, activeTabId, addTab } = useRequestPlaygroundStore();

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const {mutateAsync, isPending} = useSaveRequest(activeTab?.requestId!);
  const [showSaveModal, setShowSaveModal] = useState(false);


  const getCurrentRequestData = () => {
    if (!activeTab) {
      return {
        name: "Untitled Request",
        method: REST_METHOD.GET as REST_METHOD,
        url: "https://echo.hoppscotch.io"
      };
    }

    return {
      name: activeTab.title || "Untitled Request",
      method: (activeTab.method as REST_METHOD) || REST_METHOD.GET,
      url: activeTab.url || "https://echo.hoppscotch.io"
    };
  };

 useHotkeys(
  "ctrl+s, meta+s",
  async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!activeTab) {
      toast.error("No active request to save");
      return;
    }

    if (activeTab.collectionId) {
  
      try {
        await mutateAsync({
          url: activeTab.url || "https://echo.hoppscotch.io",
          method: activeTab.method as REST_METHOD,
          name: activeTab.title || "Untitled Request",
          body: activeTab.body,
          headers: activeTab.headers,
          parameters: activeTab.parameters,
          
        });
        toast.success("Request updated");
      } catch (err) {
        console.error("Failed to update request:", err);
        toast.error("Failed to update request");
      }
    } else {
     
      setShowSaveModal(true);
    }
  },
  { preventDefault: true, enableOnFormTags: true },
  [activeTab]
);


  useHotkeys(
    "ctrl+g, meta+shift+n",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      addTab();
      toast.success("New request created");
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
    },
    []
  );

  if (!activeTab) {
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <TabBar />
        <div className="flex space-y-4 flex-col flex-1 items-center justify-center p-6">
          <div className="flex flex-col justify-center items-center h-28 w-28 border border-zinc-800 rounded-full bg-zinc-900/80 shadow-lg">
            <Unplug size={52} className="text-indigo-400" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-zinc-200">No open requests</p>
            <p className="text-xs text-zinc-500">Create a new tab to start crafting your HTTP request.</p>
          </div>

          <Button onClick={addTab} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-3">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Request
          </Button>

          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg space-y-2 text-xs">
            <div className="flex justify-between items-center gap-8">
              <kbd className="px-2 py-0.5 bg-zinc-800 text-indigo-400 text-xs rounded border border-zinc-700">Ctrl+Shift+N</kbd>
              <span className="text-zinc-400">New Request</span>
            </div>
            <div className="flex justify-between items-center gap-8">
              <kbd className="px-2 py-0.5 bg-zinc-800 text-indigo-400 text-xs rounded border border-zinc-700">Ctrl+S</kbd>
              <span className="text-zinc-400">Save Request</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TabBar />
      <div className="flex-1 overflow-auto">
        <RequestEditor />
      </div>

      {/* Save Request Modal */}
      <SaveRequestToCollectionModal
        isModalOpen={showSaveModal}
        setIsModalOpen={setShowSaveModal}
        requestData={getCurrentRequestData()}
        initialName={getCurrentRequestData().name}
      />
    </div>
  );
}