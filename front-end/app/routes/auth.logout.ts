import type { Route } from "./+types/auth.logout";
import { signOut } from "@workos-inc/authkit-remix";

export async function loader({ request }: Route.LoaderArgs) {
  return await signOut(request);
}