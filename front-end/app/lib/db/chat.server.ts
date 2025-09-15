import { v7 as uuidv7 } from "uuid";
import { db } from "../db.server";

export async function createChatSession(userId: string, title?: string) {
  return await db
    .insertInto("chat_sessions")
    .values({
      id: uuidv7(),
      updated_at: new Date().toISOString(),
      user_id: userId,
      title: title || null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getChatSessions(userId: string) {
  return await db
    .selectFrom("chat_sessions")
    .where("user_id", "=", userId)
    .selectAll()
    .orderBy("updated_at", "desc")
    .execute();
}

export async function getChatSession(sessionId: string, userId: string) {
  return await db
    .selectFrom("chat_sessions")
    .where("id", "=", sessionId)
    .where("user_id", "=", userId)
    .selectAll()
    .executeTakeFirst();
}

export async function getChatMessages(chatSessionId: string, beforeMessageId?: string, limit: number = 10) {
  let query = db
    .selectFrom("messages")
    .where("chat_session_id", "=", chatSessionId)
    .selectAll()
    .orderBy("id", "desc");

  if (beforeMessageId) {
    query = query.where("id", "<", beforeMessageId);
  }

  const messages = await query.limit(limit).execute();
  return messages.reverse(); // Return in ascending order for display
}

export async function createMessage(data: {
  chatSessionId: string;
  content: string;
  role: "user" | "assistant";
  reasoning?: string;
  contextUsed?: string;
}) {
  return await db
    .insertInto("messages")
    .values({
      id: uuidv7(),
      chat_session_id: data.chatSessionId,
      content: data.content,
      role: data.role,
      reasoning: data.reasoning || null,
      context_used: data.contextUsed || null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateChatSessionTitle(sessionId: string, title: string) {
  return await db
    .updateTable("chat_sessions")
    .set({ 
      title,
      updated_at: new Date().toISOString()
    })
    .where("id", "=", sessionId)
    .returningAll()
    .executeTakeFirst();
}

export async function updateChatSessionTimestamp(sessionId: string) {
  return await db
    .updateTable("chat_sessions")
    .set({ updated_at: new Date().toISOString() })
    .where("id", "=", sessionId)
    .executeTakeFirst();
}
