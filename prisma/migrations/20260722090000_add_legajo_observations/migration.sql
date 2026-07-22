CREATE TABLE "LegajoObservation" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LegajoObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegajoObservation_module_entityType_entityId_createdAt_idx"
ON "LegajoObservation"("module", "entityType", "entityId", "createdAt");

CREATE INDEX "LegajoObservation_createdById_idx"
ON "LegajoObservation"("createdById");

ALTER TABLE "LegajoObservation"
ADD CONSTRAINT "LegajoObservation_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
