import { createCookieSessionStorage } from "react-router";

type SessionData = {
  sessionId: string;
  userId: string;
};

type SessionFlashData = {
  error: string;
};

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
      secrets: [process.env.SESSION_SECRET || "fallback-secret"],
      secure: process.env.NODE_ENV === "production",
    },
  });