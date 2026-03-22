import {
  DeleteObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";

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
    } catch (error: any) {
      console.error(
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
