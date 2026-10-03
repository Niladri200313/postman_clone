"use client";

import React, { useState } from "react";
import { Share2, Copy, Link, Check, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGenerateWorkspaceInvite, useGetWorkspaceMemebers } from "@/modules/invites/hooks/invites";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SharePanelProps {
  workspaceId: string;
  workspaceName?: string;
}

const SharePanel = ({ workspaceId, workspaceName }: SharePanelProps) => {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const { mutateAsync, isPending } = useGenerateWorkspaceInvite(workspaceId);
  const { data: members, isLoading: membersLoading } = useGetWorkspaceMemebers(workspaceId);

  const generateLink = async () => {
    try {
      const link = await mutateAsync();
      setInviteLink(link);
      toast.success("Invite link generated!");
    } catch {
      toast.error("Failed to generate invite link");
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-zinc-800">
        <Share2 className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium">Share &amp; Collaborate</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Workspace info */}
        <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Current Workspace</p>
          <p className="text-sm font-medium text-white">{workspaceName || "—"}</p>
        </div>

        {/* Members */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Members</span>
            {!membersLoading && members && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                {members.length}
              </span>
            )}
          </div>

          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-1.5">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={member.user.image || ""} />
                    <AvatarFallback className="bg-indigo-600 text-white text-xs">
                      {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-200 truncate">{member.user.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{member.user.email}</p>
                  </div>
                  <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded capitalize">
                    {member.role?.toLowerCase() || "member"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No other members yet. Invite people below.</p>
          )}
        </div>

        {/* Invite Link */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Invite Link</span>
          </div>

          {inviteLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
                <Link className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="text-xs font-mono text-zinc-300 truncate flex-1">{inviteLink}</span>
                <button
                  onClick={copyLink}
                  className="flex-shrink-0 p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                This link expires in 24 hours. Anyone with this link can join the workspace.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={generateLink}
                disabled={isPending}
                className="w-full h-8 text-xs border-zinc-700 text-zinc-300 hover:text-white bg-transparent hover:bg-zinc-800"
              >
                <Link className="w-3 h-3 mr-1.5" />
                Regenerate Link
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={generateLink}
              disabled={isPending}
              className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <UserPlus className="w-3.5 h-3.5 mr-2" />
              {isPending ? "Generating..." : "Generate Invite Link"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharePanel;
