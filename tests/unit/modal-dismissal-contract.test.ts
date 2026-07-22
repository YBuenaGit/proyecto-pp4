import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appModalSource = readFileSync(
  new URL("../../src/components/ui/app-modal.tsx", import.meta.url),
  "utf8",
);
const attachmentPreviewSource = readFileSync(
  new URL(
    "../../src/components/ui/attachment-preview-button.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("los modales no se cierran al hacer clic en el fondo", () => {
  assert.doesNotMatch(appModalSource, /closeOnBackdropClick/);
  assert.doesNotMatch(appModalSource, /event\.target === event\.currentTarget/);
  assert.doesNotMatch(attachmentPreviewSource, /event\.target === event\.currentTarget/);
});

test("los modales conservan cierres explicitos", () => {
  assert.match(appModalSource, /if \(event\.key === "Escape"\) close\(\)/);
  assert.match(appModalSource, /target\.closest\("\[data-modal-close\]"\)/);
  assert.match(appModalSource, /aria-label="Cerrar modal"/);
  assert.match(attachmentPreviewSource, /if \(event\.key === "Escape"\) setOpen\(false\)/);
  assert.match(attachmentPreviewSource, /aria-label="Cerrar archivo"/);
});
