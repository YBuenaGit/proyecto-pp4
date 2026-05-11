CREATE TABLE "JuridicalComplainant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "juridicalInterventionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "dni" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JuridicalComplainant_juridicalInterventionId_fkey" FOREIGN KEY ("juridicalInterventionId") REFERENCES "JuridicalIntervention" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "JuridicalLinkedPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "juridicalInterventionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dni" TEXT,
    "firstName" TEXT,
    "apellidoApodoManual" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JuridicalLinkedPerson_juridicalInterventionId_fkey" FOREIGN KEY ("juridicalInterventionId") REFERENCES "JuridicalIntervention" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "JuridicalComplainant" (
  "id",
  "juridicalInterventionId",
  "sortOrder",
  "isAnonymous",
  "dni",
  "firstName",
  "lastName",
  "phone1",
  "phone2",
  "address",
  "createdAt"
)
SELECT
  lower(hex(randomblob(16))),
  "id",
  0,
  "complainantIsAnonymous",
  CASE WHEN "complainantIsAnonymous" THEN NULL ELSE "complainantDni" END,
  CASE WHEN "complainantIsAnonymous" THEN NULL ELSE "complainantFirstName" END,
  CASE WHEN "complainantIsAnonymous" THEN NULL ELSE "complainantLastName" END,
  CASE WHEN "complainantIsAnonymous" THEN NULL ELSE "complainantPhone1" END,
  CASE WHEN "complainantIsAnonymous" THEN NULL ELSE "complainantPhone2" END,
  CASE WHEN "complainantIsAnonymous" THEN NULL ELSE "complainantAddress" END,
  CURRENT_TIMESTAMP
FROM "JuridicalIntervention"
WHERE "complainantIsAnonymous"
  OR "complainantDni" IS NOT NULL
  OR "complainantFirstName" IS NOT NULL
  OR "complainantLastName" IS NOT NULL
  OR "complainantPhone1" IS NOT NULL
  OR "complainantPhone2" IS NOT NULL
  OR "complainantAddress" IS NOT NULL;

INSERT INTO "JuridicalLinkedPerson" (
  "id",
  "juridicalInterventionId",
  "sortOrder",
  "dni",
  "firstName",
  "apellidoApodoManual",
  "phone1",
  "phone2",
  "address",
  "createdAt"
)
SELECT
  lower(hex(randomblob(16))),
  intervention."id",
  0,
  COALESCE(person."dni", intervention."dniSnapshot"),
  person."firstName",
  COALESCE(person."lastName", intervention."nameSnapshot"),
  person."phone1",
  person."phone2",
  person."address",
  CURRENT_TIMESTAMP
FROM "JuridicalIntervention" intervention
LEFT JOIN "ExternalPerson" person ON person."id" = intervention."personId"
WHERE intervention."personId" IS NOT NULL
  OR intervention."dniSnapshot" IS NOT NULL
  OR intervention."nameSnapshot" IS NOT NULL;

CREATE INDEX "JuridicalComplainant_juridicalInterventionId_idx" ON "JuridicalComplainant"("juridicalInterventionId");
CREATE INDEX "JuridicalComplainant_dni_idx" ON "JuridicalComplainant"("dni");
CREATE INDEX "JuridicalComplainant_lastName_idx" ON "JuridicalComplainant"("lastName");
CREATE INDEX "JuridicalLinkedPerson_juridicalInterventionId_idx" ON "JuridicalLinkedPerson"("juridicalInterventionId");
CREATE INDEX "JuridicalLinkedPerson_dni_idx" ON "JuridicalLinkedPerson"("dni");
CREATE INDEX "JuridicalLinkedPerson_firstName_idx" ON "JuridicalLinkedPerson"("firstName");
CREATE INDEX "JuridicalLinkedPerson_apellidoApodoManual_idx" ON "JuridicalLinkedPerson"("apellidoApodoManual");
