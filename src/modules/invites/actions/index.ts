"use server"

import db from "@/lib/db"
import { env } from "@/lib/env"
import { currentUser } from "@/modules/authentication/actions"
import { MEMBER_ROLE } from "@prisma/client"
import { randomBytes } from "crypto"

export const generateWorkspaceInvite = async (workspaceId: string) => {
  const token = randomBytes(16).toString("hex")
const user = await currentUser()
if(!user) throw new Error("Unauthorized")
  const invite = await db.workspaceInvite.create({
    data: {
      workspaceId,
      token,
      createdById: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), 
    }
  })

  return `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`
}

export const acceptWorkspaceInvite = async (token: string) => {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const invite = await db.workspaceInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    return {
      success: false,
      error: "This invite link is invalid or has already been used.",
    };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return {
      success: false,
      error: "This invite link has expired.",
    };
  }

  // Check if user is already a member
  const existingMember = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: invite.workspaceId,
      },
    },
  });

  // Check if user is the workspace owner
  const workspace = await db.workspace.findUnique({
    where: { id: invite.workspaceId },
  });

  const isOwner = workspace?.ownerId === user.id;

  if (!existingMember && !isOwner) {
    await db.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: MEMBER_ROLE.VIEWER,
      },
    });
  }

  return { success: true };
};

export const getAllWorkspaceMembers = async (workspaceId: string) => {
  return await db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
  });
};