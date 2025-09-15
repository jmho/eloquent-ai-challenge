import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Eloquent AI Chatbot" },
    {
      name: "description",
      content: "AI-powered fintech customer support chatbot",
    },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Eloquent AI Chatbot
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Get instant answers to your fintech questions
        </p>
        <div className="space-y-4">
          <a
            href="/chat"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Chatting
          </a>
          <div className="text-sm text-gray-500">
            <a href="/auth/login" className="text-blue-600 hover:underline">
              Sign in
            </a>{" "}
            for persistent chat history
          </div>
        </div>
      </div>
    </div>
  );
}
