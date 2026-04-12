/**
 * Load `api/.env` reliably whether the process cwd is the repo root or `api/`,
 * and whether we run from `src/` (tsx) or `dist/src/` (node).
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const candidates = [
  path.join(__dirname, "../.env"),
  path.join(__dirname, "../../.env"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "api", ".env"),
];

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
