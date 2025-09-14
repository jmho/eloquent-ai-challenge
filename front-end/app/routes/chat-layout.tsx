import type { Route } from "./+types/chat-layout";
import { Outlet } from "react-router";
import { Form } from "react-router";
import { requireSession } from "../lib/session/auth.server";
import { commitSession } from "../lib/session/cookie.server";
import { getChatSessions, createChatSession } from "../lib/db/chat.server";
import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, userId } = await requireSession(request);
  const chatSessions = await getChatSessions(userId);

  return {
    chatSessions,
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { session, userId } = await requireSession(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "new-chat") {
    const newSession = await createChatSession(userId);
    return redirect(`/chat/${newSession.id}`, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  return { error: "Invalid intent" };
}

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  const { chatSessions } = loaderData;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Form method="post" action="/chat">
            <input type="hidden" name="intent" value="new-chat" />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Chat
            </button>
          </Form>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Recent Chats
          </h2>
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <a
                key={session.id}
                href={`/chat/${session.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
              >
                <div className="font-medium text-sm text-gray-900 truncate">
                  {session.title || "Untitled Chat"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {session.updated_at.toLocaleDateString()}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
