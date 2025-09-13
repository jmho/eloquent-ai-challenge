import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { init } from "@paralleldrive/cuid2";
import type { DB } from "../generated/types";
import { webcrypto } from "node:crypto";

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});

// Helper to ensure we have a valid database connection
export async function ensureDbConnection() {
  try {
    await db.selectFrom("users").select("id").limit(1).execute();
  } catch (error) {
    console.error("Database connection failed:", error);
    throw new Error("Failed to connect to database");
  }
}

const isProd = process.env.NODE_ENV === "production";

const secureishRandom = () => {
  const u52 = new Uint32Array(2);
  webcrypto.getRandomValues(u52);
  return (u52[0] * 2 ** 21 + (u52[1] >>> 11)) / 2 ** 53;
};

export const createId = init({
  random: secureishRandom,
  length: isProd ? 24 : 12,
});
