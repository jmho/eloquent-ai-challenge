import { createId, db } from "../db.server";

export async function createChatSession(userId: string, title?: string) {
  return await db
    .insertInto("chat_sessions")
    .values({
      id: createId(),
      updated_at: new Date().toISOString(),
      user_id: userId,
      title: title || "New Chat",
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

export async function getChatMessages(chatSessionId: string) {
  return await db
    .selectFrom("messages")
    .where("chat_session_id", "=", chatSessionId)
    .selectAll()
    .orderBy("created_at", "asc")
    .execute();
}

export async function createMessage(data: {
  chatSessionId: string;
  content: string;
  role: "user" | "assistant";
  contextUsed?: string;
}) {
  return await db
    .insertInto("messages")
    .values({
      id: createId(),
      chat_session_id: data.chatSessionId,
      content: data.content,
      role: data.role,
      context_used: data.contextUsed,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateChatSessionTitle(sessionId: string, title: string) {
  return await db
    .updateTable("chat_sessions")
    .set({ title })
    .where("id", "=", sessionId)
    .returningAll()
    .executeTakeFirst();
}
