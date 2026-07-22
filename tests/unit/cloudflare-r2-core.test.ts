import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CLOUDFLARE_R2_ROOT_PREFIX,
  FileUploadValidationError,
  MAX_UPLOAD_FILE_BYTES,
  assertProjectObjectKey,
  assertUploadLimits,
  createCloudflareR2Storage,
  decryptR2Object,
  encryptR2Object,
} from "../../src/lib/cloudflare-r2-core";

const encryptionKey = Buffer.alloc(32, 7);

test("encrypts and decrypts an R2 object without exposing its contents", () => {
  const plainText = Buffer.from("contenido confidencial");
  const encrypted = encryptR2Object(plainText, encryptionKey);

  assert.notDeepEqual(encrypted, plainText);
  assert.equal(encrypted.includes(plainText), false);
  assert.deepEqual(decryptR2Object(encrypted, encryptionKey), plainText);
});

test("rejects a modified encrypted object", () => {
  const encrypted = encryptR2Object(Buffer.from("contenido"), encryptionKey);
  encrypted[encrypted.length - 1] ^= 1;

  assert.throws(() => decryptR2Object(encrypted, encryptionKey));
});

test("rejects keys outside the project prefix", () => {
  assert.doesNotThrow(() => assertProjectObjectKey(`${CLOUDFLARE_R2_ROOT_PREFIX}/objects/id.bin`));
  assert.throws(() => assertProjectObjectKey("otro-proyecto/objects/id.bin"));
  assert.throws(() => assertProjectObjectKey(`${CLOUDFLARE_R2_ROOT_PREFIX}-otro/objects/id.bin`));
});

test("enforces the 1 GB per-file limit and four-file batch limit", () => {
  assert.doesNotThrow(() => assertUploadLimits([{ size: MAX_UPLOAD_FILE_BYTES }]));
  assert.throws(
    () => assertUploadLimits([{ size: MAX_UPLOAD_FILE_BYTES + 1 }]),
    FileUploadValidationError,
  );
  assert.throws(
    () => assertUploadLimits(Array.from({ length: 5 }, () => ({ size: 1 }))),
    FileUploadValidationError,
  );
});

test("uploads only an encrypted private object under an opaque project key", async () => {
  const commands: unknown[] = [];
  const storage = createCloudflareR2Storage({
    bucket: "test-bucket",
    encryptionKey,
    send: async (command) => {
      commands.push(command);
      return {};
    },
  });

  const uploaded = await storage.uploadFile({
    file: Buffer.from("documento reservado"),
    fileName: "Informe sensible.pdf",
    contentType: "application/pdf",
  });

  assert.equal(commands.length, 1);
  assert.ok(commands[0] instanceof PutObjectCommand);
  const input = commands[0].input;
  assert.equal(input.Bucket, "test-bucket");
  assert.match(String(input.Key), /^secretaria-de-seguridad\/objects\/[0-9a-f-]+\.bin$/);
  assert.equal(String(input.Key).includes("Informe"), false);
  assert.equal(input.ACL, undefined);
  assert.equal(input.ContentType, "application/octet-stream");
  assert.equal(Buffer.from(input.Body as Uint8Array).includes(Buffer.from("documento reservado")), false);
  assert.equal(uploaded.originalName, "Informe sensible.pdf");
  assert.equal(uploaded.fileName, "Informe-sensible.pdf");
});

test("downloads only the requested project object and decrypts it", async () => {
  const objectKey = `${CLOUDFLARE_R2_ROOT_PREFIX}/objects/id.bin`;
  const encrypted = encryptR2Object(Buffer.from("archivo"), encryptionKey);
  const commands: unknown[] = [];
  const storage = createCloudflareR2Storage({
    bucket: "test-bucket",
    encryptionKey,
    send: async (command) => {
      commands.push(command);
      return {
        Body: { transformToByteArray: async () => Uint8Array.from(encrypted) },
      };
    },
  });

  assert.deepEqual(await storage.downloadFile(objectKey, 1), Buffer.from("archivo"));
  assert.equal(commands.length, 1);
  assert.ok(commands[0] instanceof GetObjectCommand);
  assert.equal(commands[0].input.Key, objectKey);
});

test("seed checks one deterministic key and writes only when it is absent", async () => {
  const missingCommands: unknown[] = [];
  const missingStorage = createCloudflareR2Storage({
    bucket: "test-bucket",
    encryptionKey,
    send: async (command) => {
      missingCommands.push(command);
      if (command instanceof HeadObjectCommand) {
        const error = new Error("missing");
        error.name = "NotFound";
        throw error;
      }
      return {};
    },
  });

  const first = await missingStorage.ensureSeedObject(Buffer.from("fixture"));
  assert.deepEqual(missingCommands.map((command) => (command as object).constructor.name), [
    "HeadObjectCommand",
    "PutObjectCommand",
  ]);
  assert.match(first.objectKey, /^secretaria-de-seguridad\/seed\/native\/[0-9a-f]{64}\.bin$/);
  assert.equal(first.encryptionVersion, 0);

  const existingCommands: unknown[] = [];
  const existingStorage = createCloudflareR2Storage({
    bucket: "test-bucket",
    encryptionKey,
    send: async (command) => {
      existingCommands.push(command);
      return {};
    },
  });
  const second = await existingStorage.ensureSeedObject(Buffer.from("fixture"));

  assert.equal(second.objectKey, first.objectKey);
  assert.deepEqual(existingCommands.map((command) => (command as object).constructor.name), [
    "HeadObjectCommand",
  ]);
});
