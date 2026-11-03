import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Files kept in a folder on this server instead of S3/R2: STORAGE=local, as in the Docker
 * quickstart. Only r2.service.ts uses this, so it stays the one place that talks to storage.
 *
 * The folder has two parts, like the two buckets: `public/` (logos, served by
 * GET /public/files/logos/:name) and `private/` (CVs, which leave only through the CV route after
 * its access check). Every key is matched against a strict pattern before a path is built from it,
 * so no request can reach a file outside these.
 */

export const LOGO_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp|svg)$/;
const RESUME_KEY = /^resumes\/[0-9a-f-]{36}\.pdf$/;

export const LOGO_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

function root(): string {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));
}

function logoPath(name: string): string {
  if (!LOGO_NAME.test(name)) throw new Error("Invalid logo name");
  return path.join(root(), "public", "logos", name);
}

function resumePath(key: string): string {
  if (!RESUME_KEY.test(key)) throw new Error("Invalid CV key");
  return path.join(root(), "private", key);
}

/** Writes beside the target and then renames, so a half-written file is never read. */
async function writeAtomically(target: string, bytes: Buffer): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, bytes, { mode: 0o600 });
  await fs.rename(temporary, target);
}

async function readOrNull(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export const localStorage = {
  /** Saves a logo under the given name (`<uuid>.<ext>`). */
  async putLogo(name: string, bytes: Buffer): Promise<void> {
    await writeAtomically(logoPath(name), bytes);
  },

  /** A logo's bytes, or null when there is none by that name (or the name is not one of ours). */
  async getLogo(name: string): Promise<Buffer | null> {
    if (!LOGO_NAME.test(name)) return null;
    return readOrNull(logoPath(name));
  },

  async putResume(key: string, bytes: Buffer): Promise<void> {
    await writeAtomically(resumePath(key), bytes);
  },

  async getResume(key: string): Promise<Buffer | null> {
    if (!RESUME_KEY.test(key)) return null;
    return readOrNull(resumePath(key));
  },

  /** Like deleting from a bucket: a file that is already gone is not an error. */
  async deleteResume(key: string): Promise<void> {
    try {
      await fs.unlink(resumePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  },
};
