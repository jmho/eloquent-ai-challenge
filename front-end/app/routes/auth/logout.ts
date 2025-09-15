import { signOut } from "@workos-inc/authkit-react-router";
import { destroySession, getSession } from "../../lib/session/cookie.server";
import type { Route } from "./+types/logout";

export async function loader({ request }: Route.LoaderArgs) {
  // Clear our session cookie as well
  const session = await getSession(request.headers.get("Cookie"));

  const resp = await signOut(request);

  // Add our set-cookie header to destroy our session
  resp.headers.append("Set-Cookie", await destroySession(session));

  return resp;
}
