import { getSignInUrl } from "@workos-inc/authkit-remix";
import { redirect } from "react-router";

export const loader = async () => {
  const signInUrl = await getSignInUrl();

  return redirect(signInUrl);
};
