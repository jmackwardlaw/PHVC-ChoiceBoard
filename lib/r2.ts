import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Server-only Cloudflare R2 client (S3-compatible). Holds the athletes'
// uploaded photos/videos in a PRIVATE bucket — files are only ever reachable
// through short-lived presigned URLs we mint here. NEVER import into a client
// component; these credentials must stay on the server.
function client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY environment variables.",
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function bucket(): string {
  const name = process.env.R2_BUCKET;
  if (!name) throw new Error("Missing R2_BUCKET environment variable.");
  return name;
}

// One-time URL the browser PUTs the file straight to (keeps big uploads off
// our serverless functions). Content-Type is intentionally not signed so the
// browser can send whatever the file is.
export function presignUpload(key: string): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: 600 },
  );
}

// Short-lived read URL handed to coaches so they can view an upload.
export function presignDownload(key: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: 60 * 60 },
  );
}

export async function deleteObjects(keys: string[]): Promise<void> {
  const valid = keys.filter(Boolean);
  if (!valid.length) return;
  await client().send(
    new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: { Objects: valid.map((Key) => ({ Key })) },
    }),
  );
}
