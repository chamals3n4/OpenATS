import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import logger from "../utils/logger";

function mapS3Error(err: unknown, action: "upload" | "delete" | "read"): Error {
  const e = err as {
    name?: string;
    message?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const code = e?.name ?? e?.Code ?? "";
  const msg = String(e?.message ?? err);
  if (code === "AccessDenied" || /AccessDenied|Access Denied/i.test(msg)) {
    if (action === "upload") {
      return new Error(
        "Resume storage denied permission (R2 AccessDenied). In Cloudflare: R2 \u2192 Manage R2 API Tokens \u2192 create a token with Object Read and Write for your bucket. Confirm R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in api/.env match that bucket.",
      );
    }
    if (action === "read") {
      return new Error(
        "Could not read file from storage (Access Denied). Ensure your R2 API token includes Object Read permission for the bucket. Confirm R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in api/.env.",
      );
    }
    return new Error(
      "Could not delete file in storage (Access Denied). Check R2 API token permissions.",
    );
  }
  if (code === "NoSuchBucket" || /NoSuchBucket/i.test(msg)) {
    return new Error(
      "R2 bucket not found. Set R2_BUCKET_NAME to your bucket\u2019s name in api/.env.",
    );
  }
  if (code === "InvalidAccessKeyId" || /InvalidAccessKeyId/i.test(msg)) {
    return new Error(
      "Invalid R2 credentials. Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in api/.env.",
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

const r2Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const r2Service = {
  async uploadFile(
    file: Express.Multer.File,
    folder: "resumes" | "logos" = "resumes",
  ): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${folder}/${crypto.randomUUID()}${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await r2Client.send(command);
    } catch (error: unknown) {
      logger.error(
        `Attempting upload to Bucket: ${process.env.R2_BUCKET_NAME}`,
      );
      throw mapS3Error(error, "upload");
    }

    const publicUrl = process.env.R2_PUBLIC_URL?.endsWith("/")
      ? process.env.R2_PUBLIC_URL.slice(0, -1)
      : process.env.R2_PUBLIC_URL;

    return `${publicUrl}/${fileName}`;
  },

  /** Fetch object bytes (e.g. resume PDF) using S3 API \u2014 works without public bucket CORS. */
  async getObjectBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });
    try {
      const response = await r2Client.send(command);
      if (!response.Body) {
        throw new Error(`Empty body for R2 key: ${key}`);
      }
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error: unknown) {
      throw mapS3Error(error, "read");
    }
  },

  extractKeyFromUrl(fileUrl: string): string | null {
    if (!fileUrl) return null;

    const base = process.env.R2_PUBLIC_URL?.endsWith("/")
      ? process.env.R2_PUBLIC_URL.slice(0, -1)
      : process.env.R2_PUBLIC_URL;

    if (!base) return null;
    if (!fileUrl.startsWith(`${base}/`)) return null;

    return fileUrl.replace(`${base}/`, "");
  },

  /**
   * Resolves the S3 object key from a stored public URL or path-style URL.
   * Uses R2_PUBLIC_URL prefix first; otherwise parses the URL path for `resumes/` or `logos/`.
   */
  getResumeKeyFromStoredUrl(fileUrl: string): string | null {
    if (!fileUrl) return null;

    const fromBase = this.extractKeyFromUrl(fileUrl);
    if (fromBase) return fromBase;

    try {
      const pathname = new URL(fileUrl).pathname;
      const trimmed = pathname.replace(/^\/+/, "");
      if (trimmed.startsWith("resumes/") || trimmed.startsWith("logos/")) {
        return trimmed;
      }
      const parts = pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => p === "resumes" || p === "logos");
      if (i !== -1) return parts.slice(i).join("/");
    } catch {
      return null;
    }
    return null;
  },

  async deleteByUrl(fileUrl: string): Promise<void> {
    const key = this.getResumeKeyFromStoredUrl(fileUrl);
    if (!key) return;

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    try {
      await r2Client.send(command);
    } catch (error: unknown) {
      throw mapS3Error(error, "delete");
    }
  },
};
