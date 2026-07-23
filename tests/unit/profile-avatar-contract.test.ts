import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const schema = source("../../prisma/schema.prisma");
const migration = source(
  "../../prisma/migrations/20260722223000_add_user_avatar/migration.sql",
);
const profileActions = source("../../src/app/(app)/profile-actions.ts");
const directUploads = source("../../src/lib/direct-uploads.ts");
const directUploadShared = source("../../src/lib/direct-upload-shared.ts");
const attachmentRoute = source("../../src/app/adjuntos/[id]/route.ts");
const appShell = source("../../src/components/layout/app-shell.tsx");
const profileMenu = source(
  "../../src/components/layout/profile-avatar-menu.tsx",
);
const announcements = source("../../src/lib/announcements.ts");
const announcementsBoard = source(
  "../../src/components/announcements/announcements-board.tsx",
);

test("la migracion de avatar es aditiva y mantiene integridad referencial", () => {
  assert.match(schema, /avatarAttachmentId\s+String\?\s+@unique/);
  assert.match(schema, /@relation\("UserAvatarAttachment"/);
  assert.match(migration, /ADD COLUMN "avatarAttachmentId" TEXT/);
  assert.match(migration, /REFERENCES "Attachment"\("id"\)/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /^\s*(DROP|DELETE\s+FROM|TRUNCATE)\b/im);
});

test("la carga de avatar pertenece al usuario y acepta solo imagenes seguras", () => {
  assert.match(directUploadShared, /"PERFIL"/);
  assert.match(directUploadShared, /"UserAvatar"/);
  assert.match(directUploads, /intent\.scopeId !== user\.id/);
  assert.match(directUploads, /MAX_AVATAR_FILE_BYTES/);
  assert.match(directUploads, /AVATAR_MIME_TYPES/);
  assert.doesNotMatch(directUploads, /image\/svg\+xml/);
});

test("el cambio de avatar es inmutable por usuario, auditado y limpia la imagen anterior", () => {
  assert.match(profileActions, /const user = await requireUser\(\)/);
  assert.match(profileActions, /module: "PERFIL"/);
  assert.match(profileActions, /entityType: "UserAvatar"/);
  assert.match(profileActions, /scopeId: user\.id/);
  assert.match(profileActions, /action: "UPDATE_AVATAR"/);
  assert.match(profileActions, /deleteFile\(oldAttachment\.objectKey\)/);
  assert.match(profileActions, /attachment\.deleteMany/);
});

test("los avatares siguen privados y solo se sirven si estan vinculados", () => {
  assert.match(attachmentRoute, /attachment\.module === "PERFIL"/);
  assert.match(attachmentRoute, /avatarAttachmentId: attachment\.id/);
  assert.match(attachmentRoute, /Boolean\(profileOwner\)/);
});

test("la cabecera permite cambiar foto con una sola imagen y bloqueo de envio", () => {
  assert.match(appShell, /<ProfileAvatarMenu/);
  assert.match(profileMenu, /aria-label="Cambiar foto de perfil"/);
  assert.match(profileMenu, /maxFiles=\{1\}/);
  assert.match(profileMenu, /required/);
  assert.match(profileMenu, /submitLockedRef\.current/);
  assert.match(profileMenu, /Guardar foto/);
});

test("los anuncios usan la foto actual y una superficie azul vidriosa", () => {
  assert.match(announcements, /createdBy: \{ select: \{ avatarAttachmentId: true \} \}/);
  assert.match(announcementsBoard, /announcement\.authorAvatarAttachmentId/);
  assert.match(announcementsBoard, /currentUserAvatarAttachmentId/);
  assert.match(announcementsBoard, /<UserAvatar/);
  assert.doesNotMatch(announcementsBoard, /function initials/);
  assert.match(announcementsBoard, /backdrop-blur-xl/);
  assert.match(announcementsBoard, /src="\/logo-gum1\.webp"/);
  assert.match(announcementsBoard, /tone="glass"/);
});
