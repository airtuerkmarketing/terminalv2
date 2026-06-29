"use server";

/**
 * Landing-page (chat hero) server actions. Self-service only: a signed-in user
 * loads their OWN AI-chat history. The privileged join lives in src/lib/users.ts
 * (getUserChatHistory) and is RLS-scoped — the ai_chat_sessions/ai_chat_messages
 * SELECT policies (migration 20260623060259) gate by `user_id = auth.uid() OR
 * is_super_admin()`. Called here with the caller's OWN userId, so a user only
 * ever sees their own chats (the super-admin audit path in admin/users stays
 * separate). No admin check needed — RLS is the gate.
 */

import { getIdentity } from "@/lib/auth";
import { getUserChatHistory, type ChatSessionItem } from "@/lib/users";

/** The caller's own AI-chat sessions (newest first). */
export async function loadMyChats(sessionLimit?: number): Promise<ChatSessionItem[]> {
  const identity = await getIdentity();
  if (!identity) return [];
  return getUserChatHistory(identity.userId, { sessionLimit: sessionLimit ?? 50 });
}
