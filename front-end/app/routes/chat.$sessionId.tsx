import { useEffect, useRef } from "react";
import { data, redirect, useFetcher } from "react-router";
import {
  chatCompletionApiV1ChatPost,
  generateChatTitleApiV1GenerateTitlePost,
} from "~/generated/api";
import {
  createChatSession,
  createMessage,
  getChatMessages,
  getChatSession,
  updateChatSessionTitle,
} from "../lib/db/chat.server";
import { requireSession } from "../lib/session/auth.server";
import { commitSession } from "../lib/session/cookie.server";
import type { Route } from "./+types/chat.$sessionId";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { sessionId } = params;
  const { session, userId } = await requireSession(request);

  // Handle the special "new" session ID
  if (sessionId === "new") {
    return data(
      {
        chatSession: { id: "new", title: null, user_id: userId },
        messages: [],
        isNewSession: true,
      },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      }
    );
  }

  const chatSession = await getChatSession(sessionId, userId);
  if (!chatSession) {
    throw new Response("Chat session not found", { status: 404 });
  }

  const messages = await getChatMessages(sessionId);

  return data(
    {
      chatSession,
      messages,
      isNewSession: false,
    },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
}

export async function action({ params, request }: Route.ActionArgs) {
  const { sessionId } = params;
  const { session, userId } = await requireSession(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  let actualSessionId = sessionId;
  let chatSession;

  // Handle creating a new session when sessionId is "new"
  if (sessionId === "new") {
    chatSession = await createChatSession(userId);
    actualSessionId = chatSession.id;
  } else {
    chatSession = await getChatSession(sessionId, userId);
    if (!chatSession) {
      throw new Response("Chat session not found", { status: 404 });
    }
  }

  if (intent === "send-message") {
    const message = formData.get("message") as string;
    if (!message.trim()) {
      return { error: "Message cannot be empty" };
    }

    // Save user message
    await createMessage({
      chatSessionId: actualSessionId,
      content: message,
      role: "user",
    });

    // Call AI service
    try {
      const res = await Promise.allSettled([
        chatCompletionApiV1ChatPost({
          body: {
            message,
          },
        }),
        generateChatTitleApiV1GenerateTitlePost({ body: { text: message } }),
      ]);

      const chatCompletionResponse = res[0];
      const titleGenerationResponse = res[1];

      if (chatCompletionResponse.status === "rejected") {
        throw chatCompletionResponse.reason;
      }

      if (titleGenerationResponse.status === "rejected") {
        throw titleGenerationResponse.reason;
      }

      const responseData = chatCompletionResponse.value.data;
      const titleData = titleGenerationResponse.value.data;

      if (!responseData || !titleData) {
        throw new Error("Missing response from AI service");
      }

      // Save AI response
      await createMessage({
        chatSessionId: actualSessionId,
        content: responseData.response,
        role: "assistant",
        contextUsed: JSON.stringify(responseData.reasoning),
      });

      // Update session title if it's the first message
      if (!chatSession.title) {
        await updateChatSessionTitle(actualSessionId, titleData.title);
      }
    } catch (error) {
      console.error("AI service error:", error);
      await createMessage({
        chatSessionId: actualSessionId,
        content:
          "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        role: "assistant",
      });
    }

    return redirect(`/chat/${actualSessionId}`, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

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

export default function ChatSession({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { chatSession, messages, isNewSession } = loaderData;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetcher = useFetcher();

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">
          {isNewSession ? "New Chat" : chatSession.title || "New Chat"}
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="text-xs mt-1 opacity-70">
                  {message.created_at.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <fetcher.Form ref={formRef} method="post">
            <input type="hidden" name="intent" value="send-message" />
            <div className="flex gap-3">
              <input
                type="text"
                name="message"
                placeholder="Type your message..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                disabled={isSubmitting}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Sending..." : "Send"}
              </button>
            </div>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
