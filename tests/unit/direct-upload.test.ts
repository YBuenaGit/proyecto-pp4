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

test("mantiene el limite acordado de treinta archivos de un GB", () => {
  assert.equal(MAX_DIRECT_UPLOAD_FILES, 30);
  assert.equal(MAX_DIRECT_UPLOAD_FILE_BYTES, 1024 ** 3);
});

test("conserva los endpoints multipart y previews compatibles con Strict Mode", () => {
  const partsRoute = source("../../src/app/api/uploads/[id]/parts/route.ts");
  const completeRoute = source("../../src/app/api/uploads/[id]/complete/route.ts");
  const input = source("../../src/components/ui/direct-upload-input.tsx");
  const service = source("../../src/lib/direct-uploads.ts");

  assert.match(partsRoute, /export async function POST/);
  assert.match(partsRoute, /getDirectUploadPartUrls/);
  assert.match(completeRoute, /export async function POST/);
  assert.match(completeRoute, /completeDirectUpload/);
  assert.match(input, /const objectUrl = URL\.createObjectURL\(file\)/);
  assert.match(input, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(input, /image\.removeAttribute\("src"\)/);
  assert.match(input, /video\.removeAttribute\("src"\)/);
  assert.doesNotMatch(input, /useState\(\(\) => URL\.createObjectURL/);
  assert.match(service, /const attachments = await tx\.attachment\.createManyAndReturn/);
  assert.match(service, /const updatedSessions = await tx\.uploadSession\.updateMany/);
});

test("retenciones vincula hasta treinta archivos sin agotar la transaccion", () => {
  const service = source("../../src/lib/direct-uploads.ts");
  const functionStart = service.indexOf(
    "export async function consumeRetentionUploads",
  );
  assert.notEqual(functionStart, -1);
  const retentionConsumer = service.slice(functionStart);

  assert.match(
    retentionConsumer,
    /tx\.retentionAttachment\.createManyAndReturn/,
  );
  assert.match(retentionConsumer, /tx\.uploadSession\.updateMany/);
  assert.doesNotMatch(retentionConsumer, /for \(const session of sessions\)/);
  assert.match(retentionConsumer, /updatedSessions\.count !== sessions\.length/);
});

test("despacho bloquea la revision mientras haya archivos sin terminar", () => {
  const input = source("../../src/components/ui/direct-upload-input.tsx");
  const dispatchWizard = source(
    "../../src/app/(app)/despacho/dispatch-wizard-form.tsx",
  );
  const warning =
    "Espera a que terminen todas las cargas de los archivos para continuar.";

  assert.match(input, /onUploadStateChange\?: \(state: DirectUploadState\)/);
  assert.match(input, new RegExp(warning.replace(".", "\\.")));
  assert.match(dispatchWizard, /attachmentUploadState\.uploadingFiles > 0/);
  assert.match(dispatchWizard, /attachmentUploadState\.errorFiles > 0/);
  assert.match(dispatchWizard, /setAttachmentAdvanceError/);
  assert.match(dispatchWizard, new RegExp(warning.replace(".", "\\.")));
});
