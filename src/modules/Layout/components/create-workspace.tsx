"use client";

import Modal from "@/components/ui/modal";
import { useCreateWorkspace } from "@/modules/workspace/hooks/workspace";
import React, { useState } from "react";
import { toast } from "sonner";


import { useWorkspaceStore } from "../store";

const CreateWorkspace = ({
  isModalOpen,
  setIsModalOpen,
}: {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}) => {
  const [name, setName] = useState("");
  const { mutateAsync, isPending } = useCreateWorkspace();
  const { setSelectedWorkspace } = useWorkspaceStore();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      const newWs = await mutateAsync(name); 
      if (newWs) {
        setSelectedWorkspace(newWs);
      }
      toast.success("Workspace created successfully");
      setName("");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create workspace");
      console.error("Failed to create workspace:", err);
    }
  };

  return (
    <Modal
      title="Add New Workspace"
      description="Create a new workspace to organize your projects"
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSubmit={handleSubmit}
      submitText={isPending ? "Creating..." : "Create Workspace"}
      submitVariant="default"
    >
      <div className="space-y-4">
        <input
          className="w-full p-2 border rounded"
          placeholder="Workspace name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default CreateWorkspace;
