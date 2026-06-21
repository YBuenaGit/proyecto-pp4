-- Existing attachment metadata points to local files or legacy public URLs.
-- The files were declared disposable; this migration never touches Cloudflare R2 objects.
DELETE FROM "Attachment";
DELETE FROM "RetentionAttachment";

DROP INDEX IF EXISTS "Attachment_filePath_key";

ALTER TABLE "Attachment"
  DROP COLUMN "filePath",
  ADD COLUMN "objectKey" TEXT NOT NULL,
  ADD COLUMN "encryptionVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "RetentionAttachment"
  DROP COLUMN "publicUrl",
  ADD COLUMN "encryptionVersion" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "Attachment"("objectKey");
CREATE UNIQUE INDEX "RetentionAttachment_objectKey_key" ON "RetentionAttachment"("objectKey");
