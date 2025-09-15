import { parseContextUsed } from "~/lib/utils";
import { ReasoningPopover } from "./reasoning-popover";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: Date;
  reasoning?: string | null;
  context_used?: string | null;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        } ${message.id.startsWith("temp-") ? "opacity-70" : ""} ${
          message.id.startsWith("thinking-") ? "animate-pulse" : ""
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs opacity-70">
            {message.created_at.toLocaleTimeString()}
          </div>
          {message.role === "assistant" &&
            (message.reasoning || message.context_used) && (
              <ReasoningPopover
                reasoning={message.reasoning || undefined}
                sources={parseContextUsed(message.context_used ?? null)}
              />
            )}
        </div>
      </div>
    </div>
  );
}
