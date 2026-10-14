import { Pool } from "pg";

// Cached on globalThis so hot reload in dev reuses one pool instead of opening
// a new one on every module re-evaluation.
const globalForPg = globalThis as unknown as { authPgPool?: Pool };

export const pool =
  globalForPg.authPgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForPg.authPgPool = pool;
}
