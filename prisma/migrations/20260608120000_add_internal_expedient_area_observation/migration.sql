-- AlterTable
ALTER TABLE "InternalExpedient" ADD COLUMN "area" TEXT;
ALTER TABLE "InternalExpedient" ADD COLUMN "observation" TEXT;

-- Preserve existing long descriptions in the new observation field.
UPDATE "InternalExpedient"
SET "observation" = "description"
WHERE "observation" IS NULL;

-- CreateIndex
CREATE INDEX "InternalExpedient_area_idx" ON "InternalExpedient"("area");
