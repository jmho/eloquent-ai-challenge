import { useEffect, useRef, useState } from "react";
import { data, isRouteErrorResponse, redirect, useFetcher } from "react-router";
import {
  chatCompletionApiV1ChatPost,
  generateChatTitleApiV1GenerateTitlePost,
  type ChatMessage as ApiChatMessage,
} from "~/generated/api";
import type { Route } from "../$sessionId/+types/page";
import { ChatErrorBoundary } from "../../../components/ui/error-boundary";
import { SidebarTrigger } from "../../../components/ui/sidebar";
import {
  createChatSession,
  createMessage,
  getChatMessages,
  getChatSession,
  updateChatSessionTimestamp,
  updateChatSessionTitle,
} from "../../../lib/db/chat.server";
import { requireSession } from "../../../lib/session/auth.server";
import { commitSession } from "../../../lib/session/cookie.server";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { sessionId } = params;
  const { session, userId } = await requireSession(request);
  const url = new URL(request.url);
  const beforeMessageId = url.searchParams.get("before");

  // Handle the special "new" session ID
  if (sessionId === "new") {
    return data(
      {
        chatSession: { id: "new", title: null, user_id: userId },
        messages: [],
        isNewSession: true,
        hasMore: false,
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
    throw data("Chat not found", { status: 404 });
  }

  const LIMIT = 12;

  const messages = await getChatMessages(
    sessionId,
    beforeMessageId || undefined,
    LIMIT
  );
  const hasMore = messages.length === LIMIT;

  return data(
    {
      chatSession,
      messages,
      isNewSession: false,
      hasMore,
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

    // Update chat session timestamp for user activity
    await updateChatSessionTimestamp(actualSessionId);

    // Get recent messages for conversation history (last 6 messages = 3 turns)
    const recentMessages = await getChatMessages(actualSessionId, undefined, 6);
    const conversationHistory: ApiChatMessage[] = recentMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Call AI service
    try {
      // Only generate title if the chat session doesn't have one
      const needsTitle = !chatSession.title;

      const chatPromise = chatCompletionApiV1ChatPost({
        body: {
          message,
          conversation_history: conversationHistory,
        },
      });

      const titlePromise = needsTitle
        ? generateChatTitleApiV1GenerateTitlePost({ body: { text: message } })
        : null;

      const [chatResult, titleResult] = await Promise.allSettled([
        chatPromise,
        ...(titlePromise ? [titlePromise] : []),
      ]);

      if (chatResult.status === "rejected") {
        throw chatResult.reason;
      }

      if (titleResult && titleResult.status === "rejected") {
        throw titleResult.reason;
      }

      const responseData = chatResult.value.data;
      const titleData =
        titleResult && titleResult.status === "fulfilled"
          ? titleResult.value.data
          : undefined;

      if (!responseData) {
        throw new Error("Missing response from AI service");
      }

      // Save contexts as JSON for later parsing in UI
      const contextsJson =
        responseData.contexts && responseData.contexts.length > 0
          ? JSON.stringify(responseData.contexts)
          : undefined;

      // Save AI response
      await createMessage({
        chatSessionId: actualSessionId,
        content: responseData.response,
        role: "assistant",
        reasoning: responseData.reasoning,
        contextUsed: contextsJson,
      });

      // Update chat session timestamp to reflect latest activity
      await updateChatSessionTimestamp(actualSessionId);

      if (titleData) {
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

      // Update timestamp even for error responses
      await updateChatSessionTimestamp(actualSessionId);
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

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [
      { title: "New Chat" },
      {
        name: "description",
        content: "AI-powered fintech customer support chatbot",
      },
    ];
  }
  const { chatSession } = loaderData;
  return [
    { title: `${chatSession.title || "New Chat"}` },
    {
      name: "description",
      content: "AI-powered fintech customer support chatbot",
    },
  ];
}

export default function ChatSession({ loaderData }: Route.ComponentProps) {
  const {
    chatSession,
    messages: initialMessages,
    isNewSession,
    hasMore: initialHasMore,
  } = loaderData;
  const [allMessages, setAllMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const fetcher = useFetcher();
  const loadMoreFetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const isSubmitting = fetcher.state === "submitting";

  // Reset form when submission is complete
  useEffect(() => {
    if (fetcher.state === "idle" && formRef.current) {
      formRef.current.reset();
    }
  }, [fetcher.state]);

  useEffect(() => {
    setAllMessages(initialMessages);
    setHasMore(initialHasMore);
  }, [initialMessages, initialHasMore]);

  useEffect(() => {
    if (loadMoreFetcher.data && loadMoreFetcher.state === "idle") {
      const newMessages = loadMoreFetcher.data.messages;
      const newHasMore = loadMoreFetcher.data.hasMore;

      setAllMessages((prev) => [...prev, ...newMessages]);
      setHasMore(newHasMore);
    }
  }, [loadMoreFetcher.data, loadMoreFetcher.state]);

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          loadMoreFetcher.state === "idle" &&
          allMessages.length > 0
        ) {
          const oldestMessageId = allMessages[allMessages.length - 1].id;
          loadMoreFetcher.load(
            `/chat/${chatSession.id}?before=${oldestMessageId}`
          );
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, loadMoreFetcher, allMessages, chatSession.id]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 bg-background border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-xl font-semibold">
          {isNewSession ? "New Chat" : chatSession.title || "New Chat"}
        </h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col-reverse">
        <div className="space-y-4">
          {hasMore && allMessages.length > 0 && (
            <div ref={loadMoreTriggerRef} className="flex justify-center py-4">
              {loadMoreFetcher.state === "loading" ? (
                <div className="text-muted-foreground text-sm">
                  Loading more messages...
                </div>
              ) : (
                <div className="h-1" />
              )}
            </div>
          )}
          {allMessages
            .slice()
            .reverse()
            .map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
        </div>
      </div>

      <ChatInput
        formRef={formRef}
        isSubmitting={isSubmitting}
        fetcher={fetcher}
      />
    </div>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  if (isRouteErrorResponse(error)) {
    let message = "An error occurred";

    if (error.status === 404) {
      message = error.data || "Chat not found";
    } else if (error.status === 403) {
      message = "You don't have permission to access this chat";
    }

    const errorObj = new Error(message);
    return <ChatErrorBoundary error={errorObj} />;
  }

  if (error instanceof Error) {
    return <ChatErrorBoundary error={error} />;
  }

  const unknownError = new Error("An unknown error occurred");
  return <ChatErrorBoundary error={unknownError} />;
}
