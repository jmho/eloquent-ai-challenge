import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Authentication routes
  route("auth/login", "routes/auth/login.ts"),
  route("auth/callback", "routes/auth/callback.ts"),
  route("auth/logout", "routes/auth/logout.ts"),

  // Chat routes with layout
  layout("routes/chat/layout.tsx", [
    route("chat", "routes/chat/page.tsx"),
    route("chat/:sessionId", "routes/chat/$sessionId/page.tsx"),
  ]),
] satisfies RouteConfig;
