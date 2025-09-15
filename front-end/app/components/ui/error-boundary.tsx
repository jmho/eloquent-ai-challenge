import { Link } from "react-router";
import { AlertCircle, Home, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface ChatErrorBoundaryProps {
  error: Error;
  retry?: () => void;
}

export function ChatErrorBoundary({ error, retry }: ChatErrorBoundaryProps) {
  const isNotFound = error.message.includes("not found") || error.message.includes("404");
  const isUnauthorized = error.message.includes("unauthorized") || error.message.includes("403");
  
  let title = "Something went wrong";
  let description = "We encountered an unexpected error. Please try again.";
  
  if (isNotFound) {
    title = "Chat not found";
    description = "This chat doesn't exist or may have been deleted.";
  } else if (isUnauthorized) {
    title = "Access denied";
    description = "You don't have permission to view this chat.";
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 bg-background border-b px-4">
        <h1 className="text-xl font-semibold">Error</h1>
      </header>

      {/* Error Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/chat/new">
                <MessageSquare className="w-4 h-4 mr-2" />
                Start New Chat
              </Link>
            </Button>
            
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>

            {retry && !isNotFound && !isUnauthorized && (
              <Button variant="outline" onClick={retry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>

          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}