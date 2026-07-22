import assert from "node:assert/strict";
import test from "node:test";
import {
  DIRECT_UPLOAD_PART_BYTES,
  MAX_DIRECT_UPLOAD_FILE_BYTES,
  MAX_DIRECT_UPLOAD_FILES,
  directUploadPartCount,
} from "../../src/lib/direct-upload-shared";

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
