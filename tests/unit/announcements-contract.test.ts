import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const schema = source("../../prisma/schema.prisma");
const migration = source(
  "../../prisma/migrations/20260722214637_add_announcements/migration.sql",
);
const actions = source("../../src/app/(app)/actions.ts");
const board = source(
  "../../src/components/announcements/announcements-board.tsx",
);
const announcementsPage = source("../../src/app/(app)/announcements-page.tsx");
const rootPage = source("../../src/app/(app)/page.tsx");
const panelPage = source("../../src/app/(app)/panel/page.tsx");
const shell = source("../../src/components/layout/app-shell.tsx");
const directUploads = source("../../src/lib/direct-uploads.ts");
const directUploadShared = source("../../src/lib/direct-upload-shared.ts");
const attachmentRoute = source("../../src/app/adjuntos/[id]/route.ts");

function functionBody(file: string, name: string, nextExport?: string) {
  const start = file.indexOf(`export async function ${name}`);
  const end = nextExport
    ? file.indexOf(`export async function ${nextExport}`, start + 1)
    : file.length;
  assert.notEqual(start, -1, `No se encontro ${name}`);
  assert.notEqual(end, -1, `No se encontro el limite de ${name}`);
  return file.slice(start, end);
}

test("la migracion de anuncios es aditiva y no contiene cambios destructivos", () => {
  assert.match(schema, /model Announcement \{/);
  assert.match(schema, /announcements\s+Announcement\[\]/);
  assert.match(migration, /CREATE TABLE "Announcement"/);
  assert.match(migration, /REFERENCES "User"\("id"\)/);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN|CONSTRAINT)/i);
  assert.doesNotMatch(migration, /ALTER\s+COLUMN/i);
});

test("todos los usuarios autenticados crean y solo admin administra anuncios", () => {
  const create = functionBody(actions, "createAnnouncement", "updateAnnouncement");
  const update = functionBody(actions, "updateAnnouncement", "deleteAnnouncement");
  const remove = functionBody(actions, "deleteAnnouncement", "restoreAnnouncement");
  const restore = functionBody(
    actions,
    "restoreAnnouncement",
    "permanentlyDeleteAnnouncement",
  );
  const permanent = functionBody(actions, "permanentlyDeleteAnnouncement");

  assert.match(create, /const user = await requireUser\(\)/);
  assert.doesNotMatch(create, /isAdmin\(user\)/);
  for (const body of [update, remove, restore, permanent]) {
    assert.match(body, /if \(!isAdmin\(user\)\)/);
  }
  for (const auditAction of [
    "CREATE",
    "UPDATE",
    "DELETE",
    "RESTORE",
    "PERMANENT_DELETE",
  ]) {
    assert.match(actions, new RegExp(`action: "${auditAction}"`));
  }
});

test("la eliminacion definitiva quita R2 antes de borrar los registros", () => {
  const permanent = functionBody(actions, "permanentlyDeleteAnnouncement");
  const r2Delete = permanent.indexOf("storage.deleteFile");
  const transaction = permanent.indexOf("prisma.$transaction");
  assert.ok(r2Delete >= 0);
  assert.ok(transaction > r2Delete);
  assert.match(permanent, /tx\.attachment\.deleteMany/);
  assert.match(permanent, /tx\.announcement\.delete/);
});

test("los adjuntos de anuncios conservan carga directa y acceso privado", () => {
  assert.match(directUploadShared, /"ANUNCIOS"/);
  assert.match(directUploadShared, /"Announcement"/);
  assert.match(directUploads, /intent\.module === "ANUNCIOS"/);
  assert.match(directUploads, /solo admiten imagenes, PDF o videos/);
  assert.match(directUploads, /anuncio existente no se pueden reemplazar/);
  assert.match(attachmentRoute, /attachment\.module === "ANUNCIOS"/);
  assert.match(
    attachmentRoute,
    /!announcement\.deletedAt \|\| isAdmin\(user\)/,
  );
  assert.match(board, /href=\{`\/adjuntos\/\$\{attachment\.id\}`\}/);
  assert.doesNotMatch(board, /objectKey|r2\.cloudflarestorage/);
});

test("la portada incluye publicacion, galeria, video, visor y papelera administrativa", () => {
  assert.match(announcementsPage, /const user = await requireUser\(\)/);
  assert.match(board, /ANUNCIOS IMPORTANTES/);
  assert.match(board, /showPreviews/);
  assert.match(board, /accept="image\/\*,application\/pdf,video\/\*"/);
  assert.match(board, /submitLockedRef\.current/);
  assert.match(board, /<ImageLightbox/);
  assert.match(board, /<video/);
  assert.match(board, /<AttachmentPreviewButton/);
  assert.match(board, /canAdminister && !isEditing/);
  assert.match(board, /canAdminister \? \(/);
});

test("inicio muestra anuncios y el tablero anterior vive en panel", () => {
  assert.match(rootPage, /announcements-page/);
  assert.match(panelPage, /title="Panel general"/);
  assert.match(panelPage, /`\/panel\?panel=/);
  assert.match(shell, /label: "Anuncios importantes"/);
  assert.match(shell, /href: "\/panel", label: "Panel general"/);
});
