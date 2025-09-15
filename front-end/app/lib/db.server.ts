import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "../generated/db/types";

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});
