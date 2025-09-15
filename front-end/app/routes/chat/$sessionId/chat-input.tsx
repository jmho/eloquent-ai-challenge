import type { RefObject } from "react";
import type { FetcherWithComponents } from "react-router";

interface ChatInputProps {
  formRef: RefObject<HTMLFormElement | null>;
  isSubmitting: boolean;
  fetcher: FetcherWithComponents<any>;
}

export function ChatInput({ formRef, isSubmitting, fetcher }: ChatInputProps) {
  return (
    <div className="shrink-0 bg-background border-t px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <fetcher.Form ref={formRef} method="post">
          <input type="hidden" name="intent" value="send-message" />
          <div className="flex gap-3">
            <input
              type="text"
              name="message"
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isSubmitting}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
