import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import {
  MAX_DIRECT_UPLOAD_FILE_BYTES,
  MAX_DIRECT_UPLOAD_FILES,
} from "./direct-upload-shared";

export const CLOUDFLARE_R2_REQUIRED_ENV_VARS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ACCOUNT_ID",
] as const;

export const CLOUDFLARE_R2_ROOT_PREFIX = "secretaria-de-seguridad";
export const R2_ENCRYPTION_VERSION = 1;
export const MAX_UPLOAD_FILE_BYTES = MAX_DIRECT_UPLOAD_FILE_BYTES;
export const MAX_UPLOAD_FILES = MAX_DIRECT_UPLOAD_FILES;
export const MAX_UPLOAD_BATCH_BYTES = MAX_UPLOAD_FILE_BYTES * MAX_UPLOAD_FILES;

const ENVELOPE_MAGIC = Buffer.from("SDSR", "ascii");
const ENVELOPE_VERSION_BYTES = 1;
const ENVELOPE_IV_BYTES = 12;
const ENVELOPE_TAG_BYTES = 16;
const ENVELOPE_HEADER_BYTES = ENVELOPE_MAGIC.length + ENVELOPE_VERSION_BYTES + ENVELOPE_IV_BYTES;

type RequiredR2EnvVar = (typeof CLOUDFLARE_R2_REQUIRED_ENV_VARS)[number];
type CloudflareR2UploadBody = File | Blob | ArrayBuffer | Uint8Array | Buffer;
type R2Command =
  | PutObjectCommand
  | GetObjectCommand
  | HeadObjectCommand
  | CreateMultipartUploadCommand
  | UploadPartCommand
  | CompleteMultipartUploadCommand
  | AbortMultipartUploadCommand
  | DeleteObjectCommand;
type R2Send = (command: R2Command) => Promise<unknown>;
type R2Presign = (command: UploadPartCommand | GetObjectCommand, expiresIn: number) => Promise<string>;

export type UploadFileToCloudflareR2Input = {
  file: CloudflareR2UploadBody;
  fileName?: string;
  contentType?: string;
};

export type UploadedCloudflareR2File = {
  objectKey: string;
  fileName: string;
  originalName: string;
  contentType: string;
  size: number;
  encryptionVersion: number;
};

export class FileUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileUploadValidationError";
  }
}

let r2Client: S3Client | null = null;
let defaultStorage: CloudflareR2Storage | null = null;

function getRequiredEnv(name: RequiredR2EnvVar) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required Cloudflare R2 environment variable: ${name}`);
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

async function sendR2Command(command: R2Command) {
  return getR2Client().send(command as never);
}

async function presignR2Command(command: UploadPartCommand | GetObjectCommand, expiresIn: number) {
  return getSignedUrl(getR2Client(), command as never, { expiresIn });
}

function decodeEncryptionKey(value: string) {
  const key = Buffer.from(value, "base64");
  if (key.byteLength !== 32) {
    throw new Error("R2_FILE_ENCRYPTION_KEY_V1 must be a base64-encoded 32-byte key.");
  }
  return key;
}

function getDefaultEncryptionKey() {
  const value = process.env.R2_FILE_ENCRYPTION_KEY_V1;
  if (!value) throw new Error("R2_FILE_ENCRYPTION_KEY_V1 is required for legacy encrypted objects.");
  return decodeEncryptionKey(value);
}

function decodeFileName(name: string) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export function sanitizeFileName(value: string) {
  const lastSegment = value.split(/[\\/]+/).pop() || "archivo";
  const sanitized = decodeFileName(lastSegment)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
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

function originalFileName(file: CloudflareR2UploadBody, fileName?: string) {
  if (fileName) return fileName;
  if (isFile(file) && file.name) return file.name;
  return "archivo";
}

function contentType(file: CloudflareR2UploadBody, explicit?: string) {
  if (explicit) return explicit;
  if (isBlob(file) && file.type) return file.type;
  return "application/octet-stream";
}

export function assertProjectObjectKey(objectKey: string) {
  if (!objectKey.startsWith(`${CLOUDFLARE_R2_ROOT_PREFIX}/`)) {
    throw new Error("Cloudflare R2 object key is outside the project prefix.");
  }
}

export function buildCloudflareR2ObjectKey() {
  return `${CLOUDFLARE_R2_ROOT_PREFIX}/objects/${randomUUID()}.bin`;
}

function buildSeedObjectKey(content: Buffer) {
  const digest = createHash("sha256").update(content).digest("hex");
  return `${CLOUDFLARE_R2_ROOT_PREFIX}/seed/native/${digest}.bin`;
}

export function assertUploadLimits(files: Array<{ size: number }>) {
  if (files.length > MAX_UPLOAD_FILES) {
    throw new FileUploadValidationError(`Se permiten hasta ${MAX_UPLOAD_FILES} archivos por envio.`);
  }
  let total = 0;
  for (const file of files) {
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      throw new FileUploadValidationError("Cada archivo puede pesar como maximo 1 GB.");
    }
    total += file.size;
  }
  if (total > MAX_UPLOAD_BATCH_BYTES) {
    throw new FileUploadValidationError("El envio completo puede pesar como maximo 4 GB.");
  }
}

export function collectUploadFiles(entries: FormDataEntryValue[]) {
  const files = entries.filter((entry): entry is File => isFile(entry) && entry.size > 0);
  assertUploadLimits(files);
  return files;
}

export function encryptR2Object(plainText: Buffer, key: Buffer) {
  if (key.byteLength !== 32) throw new Error("Cloudflare R2 encryption key must contain 32 bytes.");
  const iv = randomBytes(ENVELOPE_IV_BYTES);
  const version = Buffer.from([R2_ENCRYPTION_VERSION]);
  const header = Buffer.concat([ENVELOPE_MAGIC, version, iv]);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(header.subarray(0, ENVELOPE_MAGIC.length + ENVELOPE_VERSION_BYTES));
  const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
  return Buffer.concat([header, encrypted, cipher.getAuthTag()]);
}

export function decryptR2Object(envelope: Buffer, key: Buffer, expectedVersion = R2_ENCRYPTION_VERSION) {
  if (envelope.byteLength < ENVELOPE_HEADER_BYTES + ENVELOPE_TAG_BYTES) {
    throw new Error("Invalid encrypted Cloudflare R2 object.");
  }
  if (!envelope.subarray(0, ENVELOPE_MAGIC.length).equals(ENVELOPE_MAGIC)) {
    throw new Error("Invalid encrypted Cloudflare R2 object header.");
  }
  const version = envelope.readUInt8(ENVELOPE_MAGIC.length);
  if (version !== expectedVersion || version !== R2_ENCRYPTION_VERSION) {
    throw new Error(`Unsupported Cloudflare R2 encryption version: ${version}`);
  }
  if (key.byteLength !== 32) throw new Error("Cloudflare R2 encryption key must contain 32 bytes.");

  const ivStart = ENVELOPE_MAGIC.length + ENVELOPE_VERSION_BYTES;
  const iv = envelope.subarray(ivStart, ivStart + ENVELOPE_IV_BYTES);
  const encrypted = envelope.subarray(ENVELOPE_HEADER_BYTES, envelope.byteLength - ENVELOPE_TAG_BYTES);
  const authTag = envelope.subarray(envelope.byteLength - ENVELOPE_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(envelope.subarray(0, ENVELOPE_MAGIC.length + ENVELOPE_VERSION_BYTES));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

async function bodyToBuffer(body: unknown) {
  if (!body) throw new Error("Cloudflare R2 returned an empty object body.");
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  const transformable = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof transformable.transformToByteArray === "function") {
    return Buffer.from(await transformable.transformToByteArray());
  }
  const iterable = body as AsyncIterable<Uint8Array>;
  if (typeof iterable[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of iterable) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported Cloudflare R2 object body.");
}

export function isR2ObjectNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404;
}

export class CloudflareR2Storage {
  constructor(
    private readonly send: R2Send,
    private readonly bucket: string,
    private readonly encryptionKey?: Buffer,
    private readonly presign: R2Presign = presignR2Command,
  ) {}

  private legacyEncryptionKey() {
    return this.encryptionKey ?? getDefaultEncryptionKey();
  }

  private async putEncryptedObject(objectKey: string, plainText: Buffer) {
    assertProjectObjectKey(objectKey);
    const encrypted = encryptR2Object(plainText, this.legacyEncryptionKey());
    await this.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: encrypted,
      ContentType: "application/octet-stream",
      ContentLength: encrypted.byteLength,
      Metadata: { encryption: "aes-256-gcm", version: String(R2_ENCRYPTION_VERSION) },
    }));
  }

  async uploadFile(input: UploadFileToCloudflareR2Input): Promise<UploadedCloudflareR2File> {
    const body = await toBuffer(input.file);
    assertUploadLimits([{ size: body.byteLength }]);
    const originalName = originalFileName(input.file, input.fileName);
    const objectKey = buildCloudflareR2ObjectKey();
    await this.putEncryptedObject(objectKey, body);
    return {
      objectKey,
      fileName: sanitizeFileName(originalName),
      originalName,
      contentType: contentType(input.file, input.contentType),
      size: body.byteLength,
      encryptionVersion: R2_ENCRYPTION_VERSION,
    };
  }

  async downloadFile(objectKey: string, encryptionVersion: number) {
    assertProjectObjectKey(objectKey);
    const result = await this.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey })) as { Body?: unknown };
    return decryptR2Object(await bodyToBuffer(result.Body), this.legacyEncryptionKey(), encryptionVersion);
  }

  async createMultipartUpload(input: {
    objectKey: string;
    contentType: string;
    originalName: string;
    uploadSessionId: string;
  }) {
    assertProjectObjectKey(input.objectKey);
    const result = await this.send(new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(input.originalName)}`,
      Metadata: { uploadSessionId: input.uploadSessionId },
    })) as { UploadId?: string };
    if (!result.UploadId) throw new Error("Cloudflare R2 did not return a multipart upload id.");
    return result.UploadId;
  }

  async getUploadPartUrl(input: {
    objectKey: string;
    multipartId: string;
    partNumber: number;
    expiresIn?: number;
  }) {
    assertProjectObjectKey(input.objectKey);
    return this.presign(new UploadPartCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      UploadId: input.multipartId,
      PartNumber: input.partNumber,
    }), input.expiresIn ?? 15 * 60);
  }

  async completeMultipartUpload(input: {
    objectKey: string;
    multipartId: string;
    parts: Array<{ partNumber: number; eTag: string }>;
  }) {
    assertProjectObjectKey(input.objectKey);
    await this.send(new CompleteMultipartUploadCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      UploadId: input.multipartId,
      MultipartUpload: {
        Parts: input.parts.map((part) => ({ ETag: part.eTag, PartNumber: part.partNumber })),
      },
    }));
  }

  async abortMultipartUpload(objectKey: string, multipartId: string) {
    assertProjectObjectKey(objectKey);
    await this.send(new AbortMultipartUploadCommand({
      Bucket: this.bucket,
      Key: objectKey,
      UploadId: multipartId,
    }));
  }

  async headFile(objectKey: string) {
    assertProjectObjectKey(objectKey);
    return this.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey })) as Promise<{
      ContentLength?: number;
      ContentType?: string;
      Metadata?: Record<string, string>;
    }>;
  }

  async deleteFile(objectKey: string) {
    assertProjectObjectKey(objectKey);
    await this.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  async getDownloadUrl(input: {
    objectKey: string;
    originalName: string;
    contentType: string;
    expiresIn?: number;
  }) {
    assertProjectObjectKey(input.objectKey);
    return this.presign(new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ResponseContentType: input.contentType,
      ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(input.originalName)}`,
    }), input.expiresIn ?? 15 * 60);
  }

  async ensureSeedObject(content: Buffer) {
    const objectKey = buildSeedObjectKey(content);
    assertProjectObjectKey(objectKey);
    try {
      await this.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    } catch (error) {
      if (!isR2ObjectNotFoundError(error)) throw error;
      await this.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: content,
        ContentType: "application/octet-stream",
        ContentLength: content.byteLength,
      }));
    }
    return { objectKey, encryptionVersion: 0 };
  }
}

export function createCloudflareR2Storage(options?: {
  send?: R2Send;
  bucket?: string;
  encryptionKey?: Buffer;
  presign?: R2Presign;
}) {
  return new CloudflareR2Storage(
    options?.send ?? sendR2Command,
    options?.bucket ?? getRequiredEnv("R2_BUCKET"),
    options?.encryptionKey,
    options?.presign ?? presignR2Command,
  );
}

export function getCloudflareR2Storage() {
  if (!defaultStorage) defaultStorage = createCloudflareR2Storage();
  return defaultStorage;
}
