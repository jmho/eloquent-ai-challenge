import type { Route } from "./+types/chat.$sessionId";
import { requireSession } from "../lib/session/auth.server";
import { commitSession } from "../lib/session/cookie.server";
import {
  getChatSession,
  getChatMessages,
  createMessage,
  updateChatSessionTitle,
  createChatSession,
} from "../lib/db/chat.server";
import { redirect, Form } from "react-router";
import { useState, useEffect, useRef } from "react";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { sessionId } = params;
  const { session, userId } = await requireSession(request);

  const chatSession = await getChatSession(sessionId, userId);
  if (!chatSession) {
    throw new Response("Chat session not found", { status: 404 });
  }

  const messages = await getChatMessages(sessionId);

  return {
    chatSession,
    messages,
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { sessionId } = params;
  const { session, userId } = await requireSession(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const chatSession = await getChatSession(sessionId, userId);
  if (!chatSession) {
    throw new Response("Chat session not found", { status: 404 });
  }

  if (intent === "send-message") {
    const message = formData.get("message") as string;
    if (!message.trim()) {
      return { error: "Message cannot be empty" };
    }

    // Save user message
    await createMessage({
      chatSessionId: sessionId,
      content: message,
      role: "user",
    });

    // Call AI service
    try {
      const response = await fetch(
        `${process.env.AI_SERVICE_URL || "http://localhost:8000"}/api/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            conversation_history: [], // TODO: Add conversation history
          }),
        }
      );

      if (!response.ok) {
        throw new Error("AI service error");
      }

      const aiResponse = await response.json();

      // Save AI response
      await createMessage({
        chatSessionId: sessionId,
        content: aiResponse.response,
        role: "assistant",
        contextUsed: JSON.stringify(aiResponse.context_used),
      });

      // Update session title if it's the first message
      if (!chatSession.title) {
        const title =
          message.length > 50 ? message.substring(0, 50) + "..." : message;
        await updateChatSessionTitle(sessionId, title);
      }
    } catch (error) {
      console.error("AI service error:", error);
      await createMessage({
        chatSessionId: sessionId,
        content:
          "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        role: "assistant",
      });
    }

    return redirect(`/chat/${sessionId}`, {
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

export default function ChatSession({ loaderData }: Route.ComponentProps) {
  const { chatSession, messages } = loaderData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">
          {chatSession.title || "New Chat"}
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
                <p className="text-sm whitespace-pre-wrap">
                  {message.content}
                </p>
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
          <Form
            ref={formRef}
            method="post"
            onSubmit={(e) => {
              setIsSubmitting(true);
              // Reset form after a delay to prevent double submission
              setTimeout(() => {
                formRef.current?.reset();
              }, 100);
            }}
          >
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
          </Form>
        </div>
      </div>
    </div>
  );
}
