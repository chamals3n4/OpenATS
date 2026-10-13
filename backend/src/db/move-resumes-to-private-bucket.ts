import "dotenv/config";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * For installations upgrading from a version that kept CVs in the public bucket. Moves every file
 * under `resumes/` from R2_BUCKET_NAME (public) to R2_PRIVATE_BUCKET_NAME (no public access), and
 * removes it from the public bucket, so old public links to CVs stop working. Logos are not
 * touched. Run it once, after the migrations:
 *
 *   pnpm tsx src/db/move-resumes-to-private-bucket.ts
 *
 * It can be run again safely: a file that was already moved is no longer in the public bucket.
 */
async function main() {
  const from = process.env.R2_BUCKET_NAME;
  const to = process.env.R2_PRIVATE_BUCKET_NAME;
  if (!from || !to) throw new Error("Set R2_BUCKET_NAME and R2_PRIVATE_BUCKET_NAME first");
  if (from === to) throw new Error("R2_PRIVATE_BUCKET_NAME must be a different bucket from R2_BUCKET_NAME");

  const client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  let moved = 0;
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: from, Prefix: "resumes/", ContinuationToken: token }),
    );

    for (const { Key: key } of page.Contents ?? []) {
      if (!key) continue;
      const source = `${from}/${key.split("/").map(encodeURIComponent).join("/")}`;
      // Copied first and deleted only after the copy succeeded, so a failure loses nothing.
      await client.send(new CopyObjectCommand({ Bucket: to, Key: key, CopySource: source }));
      await client.send(new DeleteObjectCommand({ Bucket: from, Key: key }));
      moved++;
    }

    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  console.log(`Moved ${moved} CV(s) from ${from} to ${to}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
