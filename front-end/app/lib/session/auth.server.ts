import { getSession, commitSession } from "./cookie.server";
import { db, createId } from "../db.server";

export async function requireSession(request: Request) {
  // Handle anonymous user session management
  const session = await getSession(request.headers.get("Cookie"));
  let sessionId = session.get("sessionId");
  let userId = session.get("userId");

  if (!sessionId || !userId) {
    // Create new anonymous session
    sessionId = createId();

    const user = await db
      .insertInto("users")
      .values({
        id: createId(),
        session_id: sessionId,
        is_anonymous: true,
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    userId = user.id;

    // Set session data
    session.set("sessionId", sessionId);
    session.set("userId", userId);

    return {
      session,
      sessionId,
      userId,
      user,
      isAuthenticated: false,
    };
  }

  // Existing anonymous user
  if (sessionId && userId) {
    const user = await getUserBySessionId(sessionId);
    if (!user) {
      throw new Error("Session invalid");
    }

    return {
      session,
      sessionId,
      userId,
      user,
      isAuthenticated: false,
    };
  }

  throw new Error("Invalid session state");
}

// Helper function to create or get WorkOS authenticated user
export async function getOrCreateWorkOSUser(
  workosUserId: string,
  email: string
) {
  let user = await getUserByWorkOSId(workosUserId);

  if (!user) {
    // First time login with WorkOS - create user
    user = await db
      .insertInto("users")
      .values({
        id: createId(),
        workos_id: workosUserId,
        email: email,
        is_anonymous: false,
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  return user;
}

export async function getUserBySessionId(sessionId: string) {
  return await db
    .selectFrom("users")
    .where("session_id", "=", sessionId)
    .selectAll()
    .executeTakeFirst();
}

export async function getUserByWorkOSId(workosId: string) {
  return await db
    .selectFrom("users")
    .where("session_id", "=", workosId)
    .selectAll()
    .executeTakeFirst();
}
