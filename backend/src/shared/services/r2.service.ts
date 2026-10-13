import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import logger from "../../utils/logger";

const r2Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

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

const RESUME_KEY = /^resumes\/[0-9a-f-]{36}\.pdf$/;

async function put(
  bucket: string,
  key: string,
  file: Express.Multer.File,
  inline: boolean,
): Promise<void> {
  try {
    await r2Client.send(
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
  /** Stores a logo in the public bucket and returns its public URL. */
  async uploadLogo(file: Express.Multer.File): Promise<string> {
    const key = `logos/${crypto.randomUUID()}${EXT_BY_MIME[file.mimetype] ?? ""}`;

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
    await put(privateBucket(), key, file, true);
    return key;
  },

  /** Whether a string is a key this service gave out for a CV. */
  isResumeKey(key: string): boolean {
    return RESUME_KEY.test(key);
  },

  /** The stored CV's bytes. Null when there is no such file. */
  async getResume(key: string): Promise<Buffer | null> {
    try {
      const result = await r2Client.send(
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
    await r2Client.send(new DeleteObjectCommand({ Bucket: privateBucket(), Key: key }));
  },
};
