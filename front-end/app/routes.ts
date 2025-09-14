import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Authentication routes
  route("auth/login", "routes/auth.login.ts"),
  route("auth/callback", "routes/auth.callback.ts"),

  // Chat routes with layout
  layout("routes/chat-layout.tsx", [
    route("chat", "routes/chat.tsx"),
    route("chat/:sessionId", "routes/chat.$sessionId.tsx"),
  ]),
] satisfies RouteConfig;
