import { authLoader } from "@workos-inc/authkit-remix";
import type { Route } from "./+types/auth.callback";
import { redirect } from "react-router";
import { authenticateWithMigration } from "../lib/session/auth.server";
import { commitSession } from "../lib/session/cookie.server";

export async function loader(args: Route.LoaderArgs) {
  const { request } = args;

  try {
    // Use the standard authLoader to handle WorkOS authentication
    const authResult = await authLoader()(args);

    // If it's a redirect response, return it
    if (authResult instanceof Response) {
      return authResult;
    }

    // Check if we have user data from the auth result
    const user = (authResult as any)?.user;

    if (!user) {
      return redirect("/auth/login?error=no_user");
    }

    // Handle migration and authentication
    const { session } = await authenticateWithMigration(
      request,
      user.id,
      user.email
    );

    return redirect("/chat", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return redirect("/auth/login?error=auth_failed");
  }
}
