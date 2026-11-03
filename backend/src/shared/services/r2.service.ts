import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import logger from "../../utils/logger";
import { localStorage } from "./local-storage";

// STORAGE=local keeps files in a folder on this server instead (local-storage.ts), as in the
// Docker quickstart. Everything else here behaves the same either way.
const isLocal = () => process.env.STORAGE === "local";

// Created on first use, so a server that keeps files locally never needs the R2 settings.
let client: S3Client | null = null;
function r2Client(): S3Client {
  client ??= new S3Client({
    region: "us-east-1",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  return client;
}

/** Where logos are served from when files are kept locally: this API's public address. */
function localLogoUrl(name: string): string {
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 8080}`).replace(/\/+$/, "");
  return `${base}/public/files/logos/${name}`;
}

// Two buckets. Logos are shown on the careers page and in emails, so they live in a bucket anyone
// can read. CVs hold personal data: their bucket has no public access at all, and a CV only leaves
// it through this server, after the access check on the route.
const publicBucket = () => process.env.R2_BUCKET_NAME!;
const privateBucket = () => process.env.R2_PRIVATE_BUCKET_NAME!;

// Server-controlled extension per content type. We never trust the client
// filename for the stored key (an attacker could upload a `.html`/`.svg`).
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

async function put(
  bucket: string,
  key: string,
  file: Express.Multer.File,
  inline: boolean,
): Promise<void> {
  try {
    await r2Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: inline ? "inline" : "attachment",
      }),
    );
  } catch (error) {
    logger.error(`Attempting upload to Bucket: ${bucket}`);
    throw error;
  }
}

export const r2Service = {
  /** Stores a logo in the public bucket (or the local folder) and returns its public URL. */
  async uploadLogo(file: Express.Multer.File): Promise<string> {
    const name = `${crypto.randomUUID()}${EXT_BY_MIME[file.mimetype] ?? ""}`;
    if (isLocal()) {
      await localStorage.putLogo(name, file.buffer);
      return localLogoUrl(name);
    }
    const key = `logos/${name}`;

    // Raster logos render in the UI. SVGs and all other file types remain
    // downloads so uploaded executable markup can never be opened inline.
    const inline = ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);
    await put(publicBucket(), key, file, inline);

    const publicUrl = process.env.R2_PUBLIC_URL?.endsWith("/")
      ? process.env.R2_PUBLIC_URL.slice(0, -1)
      : process.env.R2_PUBLIC_URL;

    return `${publicUrl}/${key}`;
  },

  /**
   * Stores a CV in the private bucket and returns its key. The key is what the database keeps:
   * there is no URL for a CV, so there is no link that works without signing in.
   */
  async uploadResume(file: Express.Multer.File): Promise<string> {
    const key = `resumes/${crypto.randomUUID()}.pdf`;
    if (isLocal()) await localStorage.putResume(key, file.buffer);
    else await put(privateBucket(), key, file, true);
    return key;
  },

  /** The stored CV's bytes. Null when there is no such file. */
  async getResume(key: string): Promise<Buffer | null> {
    if (isLocal()) return localStorage.getResume(key);
    try {
      const result = await r2Client().send(
        new GetObjectCommand({ Bucket: privateBucket(), Key: key }),
      );
      if (!result.Body) return null;

      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchKey") return null;
      throw error;
    }
  },

  async deleteResume(key: string): Promise<void> {
    if (isLocal()) return localStorage.deleteResume(key);
    await r2Client().send(new DeleteObjectCommand({ Bucket: privateBucket(), Key: key }));
  },
};
