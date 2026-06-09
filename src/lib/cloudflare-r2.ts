import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

export const CLOUDFLARE_R2_REQUIRED_ENV_VARS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ACCOUNT_ID",
  "R2_PUBLIC_BASE_URL",
] as const;

export const CLOUDFLARE_R2_ROOT_PREFIX = "secretaria-de-seguridad";

type RequiredR2EnvVar = (typeof CLOUDFLARE_R2_REQUIRED_ENV_VARS)[number];
type CloudflareR2UploadBody = File | Blob | ArrayBuffer | Uint8Array | Buffer;

export type UploadFileToCloudflareR2Input = {
  file: CloudflareR2UploadBody;
  fileName?: string;
  contentType?: string;
  folder?: string;
};

export type UploadedCloudflareR2File = {
  bucket: string;
  objectKey: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  size: number;
};

let r2Client: S3Client | null = null;

function getRequiredEnv(name: RequiredR2EnvVar) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Cloudflare R2 environment variable: ${name}`);
  }
  return value;
}

function getR2Client() {
  if (r2Client) return r2Client;

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${getRequiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  return r2Client;
}

function normalizePublicBaseUrl() {
  return getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/g, "");
}

function decodeFileName(name: string) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function sanitizeSegment(value: string) {
  return decodeFileName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

function sanitizeFolder(folder?: string) {
  if (!folder) return "";

  return folder
    .split(/[\\/]+/)
    .map((segment) => sanitizeSegment(segment))
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

function sanitizeFileName(fileName: string) {
  const lastSegment = fileName.split(/[\\/]+/).pop() || "archivo";
  const sanitized = sanitizeSegment(lastSegment);
  return sanitized || "archivo";
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function toBuffer(file: CloudflareR2UploadBody) {
  if (Buffer.isBuffer(file)) return file;
  if (isBlob(file)) return Buffer.from(await file.arrayBuffer());
  if (file instanceof ArrayBuffer) return Buffer.from(file);
  return Buffer.from(file.buffer, file.byteOffset, file.byteLength);
}

function getOriginalFileName(file: CloudflareR2UploadBody, fileName?: string) {
  if (fileName) return fileName;
  if (isFile(file) && file.name) return file.name;
  return "archivo";
}

function getContentType(file: CloudflareR2UploadBody, contentType?: string) {
  if (contentType) return contentType;
  if (isBlob(file) && file.type) return file.type;
  return "application/octet-stream";
}

export function buildCloudflareR2ObjectKey(input: { fileName: string; folder?: string }) {
  const folder = sanitizeFolder(input.folder);
  const prefix = [CLOUDFLARE_R2_ROOT_PREFIX, folder].filter(Boolean).join("/");
  const fileName = sanitizeFileName(input.fileName);

  return `${prefix}/${crypto.randomUUID()}-${fileName}`;
}

export async function uploadFileToCloudflareR2(input: UploadFileToCloudflareR2Input): Promise<UploadedCloudflareR2File> {
  const originalFileName = getOriginalFileName(input.file, input.fileName);
  const fileName = sanitizeFileName(originalFileName);
  const contentType = getContentType(input.file, input.contentType);
  const body = await toBuffer(input.file);
  const bucket = getRequiredEnv("R2_BUCKET");
  const objectKey = buildCloudflareR2ObjectKey({
    fileName,
    folder: input.folder,
  });

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
  );

  return {
    bucket,
    objectKey,
    publicUrl: `${normalizePublicBaseUrl()}/${objectKey}`,
    fileName,
    contentType,
    size: body.byteLength,
  };
}

export async function uploadFilesToCloudflareR2(files: FormDataEntryValue[], options: { folder?: string } = {}) {
  const uploaded: UploadedCloudflareR2File[] = [];

  for (const entry of files) {
    if (!isFile(entry) || entry.size === 0) continue;

    uploaded.push(
      await uploadFileToCloudflareR2({
        file: entry,
        folder: options.folder,
      }),
    );
  }

  return uploaded;
}
