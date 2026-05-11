UPDATE "CatalogItem"
SET "active" = false
WHERE "type" = 'intervention_context';

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Direccion de Asuntos Juridicos',
    "active" = true,
    "sortOrder" = 1
WHERE "type" = 'intervention_context'
  AND "value" = 'ASUNTOS_JURIDICOS';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'ASUNTOS_JURIDICOS', 'Direccion de Asuntos Juridicos', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'ASUNTOS_JURIDICOS'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'GUM',
    "active" = true,
    "sortOrder" = 2
WHERE "type" = 'intervention_context'
  AND "value" = 'GUM';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'GUM', 'GUM', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'GUM'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Informacion de situaciones',
    "active" = true,
    "sortOrder" = 3
WHERE "type" = 'intervention_context'
  AND "value" = 'INFORMACION_SITUACIONES';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'INFORMACION_SITUACIONES', 'Informacion de situaciones', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'INFORMACION_SITUACIONES'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Mesa de denuncias',
    "active" = true,
    "sortOrder" = 4
WHERE "type" = 'intervention_context'
  AND "value" = 'MESA_DENUNCIAS';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'MESA_DENUNCIAS', 'Mesa de denuncias', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'MESA_DENUNCIAS'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Ministerio Publico Fiscal',
    "active" = true,
    "sortOrder" = 5
WHERE "type" = 'intervention_context'
  AND "value" = 'MPF';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'MPF', 'Ministerio Publico Fiscal', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'MPF'
);

UPDATE "CatalogItem"
SET "module" = 'JURIDICO',
    "label" = 'Ojos en alerta',
    "active" = true,
    "sortOrder" = 6
WHERE "type" = 'intervention_context'
  AND "value" = 'OJOS_ALERTA';

INSERT INTO "CatalogItem" ("id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'intervention_context', 'JURIDICO', 'OJOS_ALERTA', 'Ojos en alerta', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem" WHERE "type" = 'intervention_context' AND "value" = 'OJOS_ALERTA'
);
