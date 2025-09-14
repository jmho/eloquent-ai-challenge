import { getSession } from "./cookie.server";
import { db, createId } from "../db.server";

export async function requireSession(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const sessionId = session.get("sessionId");

  // Check if user is authenticated (has userId but no sessionId)
  if (userId && !sessionId) {
    const user = await db
      .selectFrom("users")
      .where("id", "=", userId)
      .where("is_anonymous", "=", false)
      .selectAll()
      .executeTakeFirst();

    if (user) {
      return {
        session,
        sessionId: null,
        userId,
        user,
        isAuthenticated: true,
      };
    }
  }

  // Check if user is anonymous (has both sessionId and userId)
  if (sessionId && userId) {
    const user = await getUserBySessionId(sessionId);
    if (user) {
      return {
        session,
        sessionId,
        userId,
        user,
        isAuthenticated: false,
      };
    }
  }

  // Create new anonymous session
  const newSessionId = createId();
  const user = await db
    .insertInto("users")
    .values({
      id: createId(),
      session_id: newSessionId,
      is_anonymous: true,
      updated_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  // Set session data
  session.set("sessionId", newSessionId);
  session.set("userId", user.id);

  return {
    session,
    sessionId: newSessionId,
    userId: user.id,
    user,
    isAuthenticated: false,
  };
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
    .where("workos_id", "=", workosId)
    .selectAll()
    .executeTakeFirst();
}

// Migration function to transfer anonymous user data to authenticated user
export async function migrateAnonymousUserToAuthenticated(
  anonymousUserId: string,
  authenticatedUserId: string
) {
  // Perform migration within a transaction for atomicity
  await db.transaction().execute(async (trx) => {
    // Transfer all chat sessions from anonymous user to authenticated user
    await trx
      .updateTable("chat_sessions")
      .set({ user_id: authenticatedUserId })
      .where("user_id", "=", anonymousUserId)
      .execute();

    // Note: chat_messages don't need to be updated since they're linked via chat_session_id
    // which now belongs to the authenticated user

    // Mark the anonymous user as migrated (keep for audit trail)
    await trx
      .updateTable("users")
      .set({ 
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", anonymousUserId)
      .execute();
  });
}

// Enhanced function to handle authentication with migration
export async function authenticateWithMigration(
  request: Request,
  workosUserId: string,
  email: string
) {
  // Get current anonymous session if exists
  const session = await getSession(request.headers.get("Cookie"));
  const currentUserId = session.get("userId");
  
  // Get or create authenticated user
  const authenticatedUser = await getOrCreateWorkOSUser(workosUserId, email);
  
  // If there was an anonymous user, migrate their data
  if (currentUserId && currentUserId !== authenticatedUser.id) {
    const anonymousUser = await db
      .selectFrom("users")
      .where("id", "=", currentUserId)
      .where("is_anonymous", "=", true)
      .selectAll()
      .executeTakeFirst();
    
    if (anonymousUser) {
      try {
        console.log(`Migrating anonymous user ${currentUserId} to authenticated user ${authenticatedUser.id}`);
        await migrateAnonymousUserToAuthenticated(currentUserId, authenticatedUser.id);
        console.log(`Successfully migrated user data`);
      } catch (error) {
        console.error("Migration failed:", error);
        // Don't throw - allow authentication to continue even if migration fails
        // This ensures users can still log in, they just won't have their chat history
      }
    }
  }
  
  // Update session with authenticated user data
  session.set("userId", authenticatedUser.id);
  session.unset("sessionId"); // No longer needed for authenticated users
  
  return {
    session,
    user: authenticatedUser,
    isAuthenticated: true,
  };
}
