import type { Route } from "./+types/chat-layout";
import { Outlet, Link } from "react-router";
import { Form } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { requireSession } from "../lib/session/auth.server";
import { commitSession } from "../lib/session/cookie.server";
import { getChatSessions } from "../lib/db/chat.server";
import { redirect } from "react-router";
import { signOut } from "@workos-inc/authkit-remix";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, userId, user, isAuthenticated } = await requireSession(request);
  const chatSessions = await getChatSessions(userId);

  return {
    chatSessions,
    user,
    isAuthenticated,
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { session, userId } = await requireSession(request);
  const formData = await request.formData();
  const intent = formData.get("intent");


  if (intent === "logout") {
    return await signOut(request);
  }

  return { error: "Invalid intent" };
}

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  const { chatSessions, user, isAuthenticated } = loaderData;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link
            to="/chat/new"
            className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            New Chat
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Recent Chats
          </h2>
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <Link
                key={session.id}
                to={`/chat/${session.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
              >
                <div className="font-medium text-sm text-gray-900 truncate">
                  {session.title || "Untitled Chat"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {session.updated_at.toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user.email || "User"}
                    </div>
                    <div className="text-xs text-gray-500">Logged in</div>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <Form method="post">
                  <input type="hidden" name="intent" value="logout" />
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="w-full cursor-default"
                    >
                      Sign out
                    </button>
                  </DropdownMenuItem>
                </Form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-center">
              <a
                href="/auth/login"
                className="inline-block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Sign in
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
