ALTER TABLE "DispatchRecord" ADD COLUMN "usesHistoricalDate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DispatchRecord" ADD COLUMN "confidentialNotes" TEXT;

UPDATE "DispatchRecord"
SET "confidentialNotes" = NULLIF(
  TRIM(
    COALESCE("notes", '') ||
    CASE
      WHEN "notes" IS NOT NULL AND "notes" <> '' AND "confidentialSummary" IS NOT NULL AND "confidentialSummary" <> ''
        THEN CHAR(10) || CHAR(10)
      ELSE ''
    END ||
    COALESCE("confidentialSummary", '')
  ),
  ''
);

CREATE TABLE "DispatchComplainant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dispatchRecordId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "dni" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "phone1" TEXT,
  "phone2" TEXT,
  "address" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DispatchComplainant_dispatchRecordId_fkey" FOREIGN KEY ("dispatchRecordId") REFERENCES "DispatchRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DispatchLinkedPerson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dispatchRecordId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "dni" TEXT,
  "firstName" TEXT,
  "apellidoApodoManual" TEXT,
  "phone1" TEXT,
  "phone2" TEXT,
  "address" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DispatchLinkedPerson_dispatchRecordId_fkey" FOREIGN KEY ("dispatchRecordId") REFERENCES "DispatchRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "DispatchComplainant" (
  "id",
  "dispatchRecordId",
  "sortOrder",
  "isAnonymous",
  "dni",
  "firstName",
  "lastName",
  "phone1",
  "phone2",
  "address"
)
SELECT
  lower(hex(randomblob(16))),
  record."id",
  CAST(person."key" AS INTEGER),
  COALESCE(json_extract(person."value", '$.isAnonymous'), false),
  NULLIF(json_extract(person."value", '$.dni'), ''),
  NULLIF(json_extract(person."value", '$.firstName'), ''),
  NULLIF(json_extract(person."value", '$.lastName'), ''),
  NULLIF(json_extract(person."value", '$.phone1'), ''),
  NULLIF(json_extract(person."value", '$.phone2'), ''),
  NULLIF(json_extract(person."value", '$.address'), '')
FROM "DispatchRecord" record, json_each(CASE WHEN json_valid(record."complainantsJson") THEN record."complainantsJson" ELSE '[]' END) person
WHERE record."complainantsJson" IS NOT NULL
  AND json_valid(record."complainantsJson") = 1
  AND json_type(record."complainantsJson") = 'array'
  AND (
    COALESCE(json_extract(person."value", '$.isAnonymous'), false)
    OR NULLIF(json_extract(person."value", '$.dni'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.firstName'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.lastName'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.phone1'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.phone2'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.address'), '') IS NOT NULL
  );

INSERT INTO "DispatchComplainant" (
  "id",
  "dispatchRecordId",
  "sortOrder",
  "isAnonymous",
  "dni",
  "firstName",
  "lastName",
  "phone1",
  "phone2",
  "address"
)
SELECT
  lower(hex(randomblob(16))),
  record."id",
  0,
  record."complainantIsAnonymous",
  record."complainantDni",
  record."complainantFirstName",
  record."complainantLastName",
  record."complainantPhone1",
  record."complainantPhone2",
  record."complainantAddress"
FROM "DispatchRecord" record
WHERE NOT EXISTS (
    SELECT 1 FROM "DispatchComplainant" complainant WHERE complainant."dispatchRecordId" = record."id"
  )
  AND (
    record."complainantIsAnonymous"
    OR record."complainantDni" IS NOT NULL
    OR record."complainantFirstName" IS NOT NULL
    OR record."complainantLastName" IS NOT NULL
    OR record."complainantPhone1" IS NOT NULL
    OR record."complainantPhone2" IS NOT NULL
    OR record."complainantAddress" IS NOT NULL
  );

INSERT INTO "DispatchLinkedPerson" (
  "id",
  "dispatchRecordId",
  "sortOrder",
  "dni",
  "firstName",
  "apellidoApodoManual",
  "phone1",
  "phone2",
  "address"
)
SELECT
  lower(hex(randomblob(16))),
  record."id",
  CAST(person."key" AS INTEGER),
  NULLIF(json_extract(person."value", '$.dni'), ''),
  NULLIF(json_extract(person."value", '$.firstName'), ''),
  NULLIF(COALESCE(json_extract(person."value", '$.apellidoApodoManual'), json_extract(person."value", '$.lastName')), ''),
  NULLIF(json_extract(person."value", '$.phone1'), ''),
  NULLIF(json_extract(person."value", '$.phone2'), ''),
  NULLIF(json_extract(person."value", '$.address'), '')
FROM "DispatchRecord" record, json_each(CASE WHEN json_valid(record."linkedPersonsJson") THEN record."linkedPersonsJson" ELSE '[]' END) person
WHERE record."linkedPersonsJson" IS NOT NULL
  AND json_valid(record."linkedPersonsJson") = 1
  AND json_type(record."linkedPersonsJson") = 'array'
  AND (
    NULLIF(json_extract(person."value", '$.dni'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.firstName'), '') IS NOT NULL
    OR NULLIF(COALESCE(json_extract(person."value", '$.apellidoApodoManual'), json_extract(person."value", '$.lastName')), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.phone1'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.phone2'), '') IS NOT NULL
    OR NULLIF(json_extract(person."value", '$.address'), '') IS NOT NULL
  );

INSERT INTO "DispatchLinkedPerson" (
  "id",
  "dispatchRecordId",
  "sortOrder",
  "dni",
  "firstName",
  "apellidoApodoManual",
  "phone1",
  "phone2",
  "address"
)
SELECT
  lower(hex(randomblob(16))),
  record."id",
  0,
  COALESCE(person."dni", record."dniSnapshot"),
  person."firstName",
  COALESCE(person."lastName", record."nameSnapshot"),
  person."phone1",
  person."phone2",
  person."address"
FROM "DispatchRecord" record
LEFT JOIN "ExternalPerson" person ON person."id" = record."personId"
WHERE NOT EXISTS (
    SELECT 1 FROM "DispatchLinkedPerson" linked WHERE linked."dispatchRecordId" = record."id"
  )
  AND (
    record."dniSnapshot" IS NOT NULL
    OR record."nameSnapshot" IS NOT NULL
    OR person."dni" IS NOT NULL
    OR person."firstName" IS NOT NULL
    OR person."lastName" IS NOT NULL
    OR person."phone1" IS NOT NULL
    OR person."phone2" IS NOT NULL
    OR person."address" IS NOT NULL
  );

CREATE INDEX "DispatchComplainant_dispatchRecordId_idx" ON "DispatchComplainant"("dispatchRecordId");
CREATE INDEX "DispatchComplainant_dni_idx" ON "DispatchComplainant"("dni");
CREATE INDEX "DispatchComplainant_lastName_idx" ON "DispatchComplainant"("lastName");
CREATE INDEX "DispatchLinkedPerson_dispatchRecordId_idx" ON "DispatchLinkedPerson"("dispatchRecordId");
CREATE INDEX "DispatchLinkedPerson_dni_idx" ON "DispatchLinkedPerson"("dni");
CREATE INDEX "DispatchLinkedPerson_firstName_idx" ON "DispatchLinkedPerson"("firstName");
CREATE INDEX "DispatchLinkedPerson_apellidoApodoManual_idx" ON "DispatchLinkedPerson"("apellidoApodoManual");

DROP INDEX IF EXISTS "DispatchRecord_complainantDni_idx";

ALTER TABLE "DispatchRecord" DROP COLUMN "manualPersonName";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantIsAnonymous";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantDni";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantFirstName";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantLastName";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantPhone1";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantPhone2";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantAddress";
ALTER TABLE "DispatchRecord" DROP COLUMN "complainantsJson";
ALTER TABLE "DispatchRecord" DROP COLUMN "linkedPersonsJson";
ALTER TABLE "DispatchRecord" DROP COLUMN "subcategory";
ALTER TABLE "DispatchRecord" DROP COLUMN "notes";
ALTER TABLE "DispatchRecord" DROP COLUMN "confidentialSummary";

UPDATE "JuridicalIntervention"
SET "nameSnapshot" = "manualPersonName"
WHERE "nameSnapshot" IS NULL
  AND "manualPersonName" IS NOT NULL;

ALTER TABLE "JuridicalIntervention" DROP COLUMN "manualPersonName";
