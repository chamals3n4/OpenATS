import { Pool } from "pg";

// Reuse one pool across hot reloads
const globalForPg = globalThis as unknown as { authPgPool?: Pool };

export const pool =
  globalForPg.authPgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForPg.authPgPool = pool;
}
