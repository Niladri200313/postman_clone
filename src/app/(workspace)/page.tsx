"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useWorkspaceStore } from "@/modules/Layout/store";
import RequestPlayground from "@/modules/request/components/request-playground";

import TabbedSidebar from "@/modules/workspace/components/sidebar";

import { useGetWorkspace } from "@/modules/workspace/hooks/workspace";
import { Loader, LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateWorkspace from "@/modules/Layout/components/create-workspace";
import { useState } from "react";

const Page = () => {
  const { selectedWorkspace } = useWorkspaceStore();
  const { data: currentWorkspace, isLoading } = useGetWorkspace(selectedWorkspace?.id ?? "");
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!selectedWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
        <LayoutDashboard className="h-12 w-12 text-zinc-600" />
        <div className="text-center">
          <p className="text-base font-medium text-zinc-300">No workspace selected</p>
          <p className="text-sm text-zinc-500 mt-1">Select an existing workspace from the header or create a new one.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
        <CreateWorkspace isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader className="animate-spin h-6 w-6 text-indigo-500" />
      </div>
    );
  }

return (
  <ResizablePanelGroup direction="horizontal">
    <ResizablePanel defaultSize={28} minSize={20} maxSize={40} className="flex">
      <div className="flex-1">
        <TabbedSidebar currentWorkspace={currentWorkspace} />
      </div>
    </ResizablePanel>

    <ResizableHandle withHandle />

    <ResizablePanel defaultSize={72} minSize={50}>
      <RequestPlayground />
    </ResizablePanel>
  </ResizablePanelGroup>
)
};

export default Page;
