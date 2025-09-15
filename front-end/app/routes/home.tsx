import { authkitLoader } from "@workos-inc/authkit-react-router";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/home";

export async function loader(args: Route.LoaderArgs) {
  const response = await authkitLoader(args, async ({ auth }) => {
    if (auth.user) {
      return redirect("/chat");
    }

    return null;
  });

  return response;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fintech AI Chatbot" },
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
          Fintech AI Chatbot
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Get instant answers to your fintech questions
        </p>
        <div className="space-y-4">
          <Link
            to="/chat"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Chatting
          </Link>
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
