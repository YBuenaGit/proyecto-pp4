UPDATE "CatalogItem"
SET "active" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'juridical_type'
  AND "value" IN ('ABOGADOS_GRATUITOS', 'CONFLICTO_VECINAL', 'CONTENCION');

UPDATE "CatalogItem"
SET "active" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'intervention_context'
  AND "value" IN ('INFORME', 'INFORME_SITUACION');

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'MPF',
    "active" = true,
    "sortOrder" = 5,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'intervention_context'
  AND "value" = 'MPF';

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Salud mental',
    "active" = true,
    "sortOrder" = 13,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'juridical_type'
  AND "value" = 'SALUD_MENTAL';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'juridical_type', 'JURIDICO', 'SALUD_MENTAL', 'Salud mental', true, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'juridical_type' AND "value" = 'SALUD_MENTAL'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Intervencion administrativa',
    "active" = true,
    "sortOrder" = 14,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'juridical_type'
  AND "value" = 'INTERVENCION_ADMINISTRATIVA';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'juridical_type', 'JURIDICO', 'INTERVENCION_ADMINISTRATIVA', 'Intervencion administrativa', true, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'juridical_type' AND "value" = 'INTERVENCION_ADMINISTRATIVA'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Notificaciones',
    "active" = true,
    "sortOrder" = 15,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'juridical_type'
  AND "value" = 'NOTIFICACIONES';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'juridical_type', 'JURIDICO', 'NOTIFICACIONES', 'Notificaciones', true, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'juridical_type' AND "value" = 'NOTIFICACIONES'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Mediacion vecinal',
    "active" = true,
    "sortOrder" = 16,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'juridical_type'
  AND "value" = 'MEDIACION_VECINAL';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'juridical_type', 'JURIDICO', 'MEDIACION_VECINAL', 'Mediacion vecinal', true, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'juridical_type' AND "value" = 'MEDIACION_VECINAL'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Audiencia',
    "active" = true,
    "sortOrder" = 17,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'juridical_type'
  AND "value" = 'AUDIENCIA';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'juridical_type', 'JURIDICO', 'AUDIENCIA', 'Audiencia', true, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'juridical_type' AND "value" = 'AUDIENCIA'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Juzgado Civil / Cial',
    "active" = true,
    "sortOrder" = 7,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'intervention_context'
  AND "value" = 'JUZGADO_CIVIL_CIAL';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'JUZGADO_CIVIL_CIAL', 'Juzgado Civil / Cial', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'JUZGADO_CIVIL_CIAL'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Juzgado de familia',
    "active" = true,
    "sortOrder" = 8,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'intervention_context'
  AND "value" = 'JUZGADO_FAMILIA';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'JUZGADO_FAMILIA', 'Juzgado de familia', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'JUZGADO_FAMILIA'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Juzgado de paz',
    "active" = true,
    "sortOrder" = 9,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'intervention_context'
  AND "value" = 'JUZGADO_PAZ';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'JUZGADO_PAZ', 'Juzgado de paz', true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'JUZGADO_PAZ'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Politica social',
    "active" = true,
    "sortOrder" = 10,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'intervention_context'
  AND "value" = 'POLITICA_SOCIAL';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'POLITICA_SOCIAL', 'Politica social', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'POLITICA_SOCIAL'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Otro',
    "active" = true,
    "sortOrder" = 11,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'intervention_context'
  AND "value" = 'OTRO';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'OTRO', 'Otro', true, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'OTRO'
);
