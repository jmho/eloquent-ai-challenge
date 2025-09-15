import { createClient } from "~/generated/api/client";

const BASE_URL = process.env.AI_SERVICE_URL;

if (!BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export const APIClient = createClient({
  baseUrl: BASE_URL,
});
