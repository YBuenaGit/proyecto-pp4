-- Retire the old category from creation forms without changing historical records.
UPDATE "CatalogItem"
SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'dispatch_category' AND "value" = 'DERIVACION_AREA';

INSERT INTO "CatalogItem" (
  "id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'catalog_dispatch_category_pedido_acta_tribunal_falta',
  'dispatch_category',
  'DESPACHO',
  'PEDIDO_ACTA_TRIBUNAL_FALTA',
  'Pedido de acta por tribunal de falta',
  true,
  40,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem"
  WHERE "type" = 'dispatch_category' AND "value" = 'PEDIDO_ACTA_TRIBUNAL_FALTA'
);

INSERT INTO "CatalogItem" (
  "id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'catalog_dispatch_area_honorable_tribunal_falta',
  'dispatch_area',
  'DESPACHO',
  'HONORABLE_TRIBUNAL_DE_FALTA',
  'Honorable tribunal de falta',
  true,
  60,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem"
  WHERE "type" = 'dispatch_area' AND "value" = 'HONORABLE_TRIBUNAL_DE_FALTA'
);

INSERT INTO "CatalogItem" (
  "id", "type", "module", "value", "label", "active", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'catalog_dispatch_area_oficios_judiciales',
  'dispatch_area',
  'DESPACHO',
  'OFICIOS_JUDICIALES',
  'Oficios judiciales',
  true,
  70,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogItem"
  WHERE "type" = 'dispatch_area' AND "value" = 'OFICIOS_JUDICIALES'
);

-- Keep catalog-backed filters ordered alphabetically as well.
UPDATE "CatalogItem"
SET "sortOrder" = CASE "value"
  WHEN 'ATENCION_GENERAL' THEN 10
  WHEN 'CONSULTA' THEN 20
  WHEN 'PEDIDO' THEN 30
  WHEN 'PEDIDO_ACTA_TRIBUNAL_FALTA' THEN 40
  WHEN 'RECLAMO' THEN 50
  WHEN 'SITUACION_VECINAL' THEN 60
  WHEN 'SUGERENCIA' THEN 70
  WHEN 'DERIVACION_AREA' THEN 900
  ELSE "sortOrder"
END,
"updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'dispatch_category';
