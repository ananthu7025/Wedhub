import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import { ExternalServiceError } from "../../common/errors";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

let client: S3Client | undefined;

function isConfigured(): boolean {
  return !!(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET &&
    env.R2_PUBLIC_BASE_URL
  );
}

function getClient(): S3Client {
  if (!isConfigured()) {
    throw new ExternalServiceError(
      "Object storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL.",
    );
  }

  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
      },
    });
  }

  return client;
}

export function isStorageConfigured(): boolean {
  return isConfigured();
}

// Every object key this app writes is a fresh randomUUID()-derived path
// (media.service.ts's createUploadRequest, and variantObjectKey() for the
// derived thumbnail/medium variants) — a key is never reused for
// different content, so it's always safe to cache these objects
// immutably forever rather than relying on R2/the CDN's shorter default.
// A vendor "changing" a photo produces a brand-new Media row/object key,
// not an overwrite, so there is no stale-cache risk to guard against.
//
// Also applied to getSignedUploadUrl's PutObjectCommand below: this param
// becomes part of what the client's actual PUT request must replicate
// exactly for the SigV4 signature to validate, so every browser-side PUT
// call site sends this exact literal as its Cache-Control header (see
// lib/media/upload.ts's UPLOAD_CACHE_CONTROL constant and its callers).
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export async function getSignedUploadUrl(objectKey: string, mimeType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: objectKey,
    ContentType: mimeType,
    CacheControl: IMMUTABLE_CACHE_CONTROL,
  });
  return getSignedUrl(getClient(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: objectKey }));
    return true;
  } catch {
    return false;
  }
}

export async function downloadObject(objectKey: string): Promise<Buffer> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: objectKey }));
  const chunks: Buffer[] = [];
  const stream = result.Body as AsyncIterable<Buffer>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function uploadObject(
  objectKey: string,
  body: Buffer,
  mimeType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: objectKey,
      Body: body,
      ContentType: mimeType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }),
  );
}

export async function deleteObject(objectKey: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: objectKey }));
}

export function getPublicUrl(objectKey: string): string {
  const base = (env.R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/${objectKey}`;
}
