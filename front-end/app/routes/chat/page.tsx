import { Link } from "react-router";
import type { Route } from "./+types/page";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fintech AI Chatbot: Chat" },
    {
      name: "description",
      content: "AI-powered fintech customer support chatbot",
    },
  ];
}

export default function Page() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to AI Chat
        </h1>
        <p className="text-gray-600 mb-6">
          Select an existing chat or start a new conversation
        </p>
        <Link
          to="/chat/new"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start New Chat
        </Link>
      </div>
    </div>
  );
}
