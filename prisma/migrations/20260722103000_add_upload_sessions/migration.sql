CREATE TABLE "UploadSession" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "scopeId" TEXT,
  "objectKey" TEXT NOT NULL,
  "multipartId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  "consumedAt" TIMESTAMPTZ(3),

  CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadSession_objectKey_key" ON "UploadSession"("objectKey");
CREATE UNIQUE INDEX "UploadSession_multipartId_key" ON "UploadSession"("multipartId");
CREATE INDEX "UploadSession_createdById_status_idx" ON "UploadSession"("createdById", "status");
CREATE INDEX "UploadSession_status_expiresAt_idx" ON "UploadSession"("status", "expiresAt");
CREATE INDEX "UploadSession_module_entityType_scopeId_idx" ON "UploadSession"("module", "entityType", "scopeId");

ALTER TABLE "UploadSession"
ADD CONSTRAINT "UploadSession_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
