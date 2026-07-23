import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DIRECT_UPLOAD_PART_BYTES,
  MAX_DIRECT_UPLOAD_FILE_BYTES,
  MAX_DIRECT_UPLOAD_FILES,
  directUploadPartCount,
} from "../../src/lib/direct-upload-shared";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("divide archivos grandes en partes multipart estables", () => {
  assert.equal(directUploadPartCount(1), 1);
  assert.equal(directUploadPartCount(DIRECT_UPLOAD_PART_BYTES), 1);
  assert.equal(directUploadPartCount(DIRECT_UPLOAD_PART_BYTES + 1), 2);
  assert.equal(
    directUploadPartCount(MAX_DIRECT_UPLOAD_FILE_BYTES),
    Math.ceil(MAX_DIRECT_UPLOAD_FILE_BYTES / DIRECT_UPLOAD_PART_BYTES),
  );
});

test("mantiene el limite acordado de cuatro archivos de un GB", () => {
  assert.equal(MAX_DIRECT_UPLOAD_FILES, 4);
  assert.equal(MAX_DIRECT_UPLOAD_FILE_BYTES, 1024 ** 3);
});

test("conserva los endpoints multipart y previews compatibles con Strict Mode", () => {
  const partsRoute = source("../../src/app/api/uploads/[id]/parts/route.ts");
  const completeRoute = source("../../src/app/api/uploads/[id]/complete/route.ts");
  const input = source("../../src/components/ui/direct-upload-input.tsx");

  assert.match(partsRoute, /export async function POST/);
  assert.match(partsRoute, /getDirectUploadPartUrls/);
  assert.match(completeRoute, /export async function POST/);
  assert.match(completeRoute, /completeDirectUpload/);
  assert.match(input, /const objectUrl = URL\.createObjectURL\(file\)/);
  assert.match(input, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(input, /image\.removeAttribute\("src"\)/);
  assert.match(input, /video\.removeAttribute\("src"\)/);
  assert.doesNotMatch(input, /useState\(\(\) => URL\.createObjectURL/);
});
