import {
  DeleteObjectCommand,
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

// Server-controlled extension per content type. We never trust the client
// filename for the stored key (an attacker could upload a `.html`/`.svg`).
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

export const r2Service = {
  async uploadFile(
    file: Express.Multer.File,
    folder: "resumes" | "logos" = "resumes",
  ): Promise<string> {
    const fileExt = EXT_BY_MIME[file.mimetype] ?? "";
    const fileName = `${folder}/${crypto.randomUUID()}${fileExt}`;

    // Logos are raster images (png/jpeg/webp — never svg) meant to render
    // inline in the UI. Everything else (resumes, and any svg) is forced to
    // download so an uploaded file can never execute as HTML/SVG when its
    // URL is opened directly in a browser.
    const isInlineableLogo =
      folder === "logos" &&
      ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: isInlineableLogo ? "inline" : "attachment",
    });

    try {
      await r2Client.send(command);
    } catch (error: any) {
      logger.error(
        `Attempting upload to Bucket: ${process.env.R2_BUCKET_NAME}`,
      );
      throw error;
    }

    const publicUrl = process.env.R2_PUBLIC_URL?.endsWith("/")
      ? process.env.R2_PUBLIC_URL.slice(0, -1)
      : process.env.R2_PUBLIC_URL;

    return `${publicUrl}/${fileName}`;
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

  async deleteByUrl(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);
    if (!key) return;

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    await r2Client.send(command);
  },
};
