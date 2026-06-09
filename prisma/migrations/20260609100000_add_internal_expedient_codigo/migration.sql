-- AlterTable
ALTER TABLE "InternalExpedient" ADD COLUMN "codigo" TEXT;

-- CreateIndex
CREATE INDEX "InternalExpedient_codigo_idx" ON "InternalExpedient"("codigo");
