-- Add the requested Despacho category and derived areas without changing
-- historical records or user-managed catalog options.
WITH requested_options ("id", "type", "module", "value", "label", "sortOrder") AS (
  VALUES
    ('catalog_dispatch_category_otros', 'dispatch_category', 'DESPACHO', 'OTROS', 'Otros', 900),
    ('catalog_dispatch_area_catastro', 'dispatch_area', 'DESPACHO', 'CATASTRO', 'Catastro', 10),
    ('catalog_dispatch_area_hacienda', 'dispatch_area', 'DESPACHO', 'HACIENDA', 'Hacienda', 40),
    ('catalog_dispatch_area_policia_de_la_provincia', 'dispatch_area', 'DESPACHO', 'POLICIA_DE_LA_PROVINCIA', 'Policia de la Provincia', 80),
    ('catalog_dispatch_area_recursos_humanos', 'dispatch_area', 'DESPACHO', 'RECURSOS_HUMANOS', 'Recursos Humanos', 90),
    ('catalog_dispatch_area_saneamiento', 'dispatch_area', 'DESPACHO', 'SANEAMIENTO', 'Saneamiento', 100)
)
UPDATE "CatalogItem" AS catalog
SET
  "module" = requested."module",
  "label" = requested."label",
  "active" = true,
  "sortOrder" = requested."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP
FROM requested_options AS requested
WHERE catalog."type" = requested."type"
  AND catalog."value" = requested."value";

WITH requested_options ("id", "type", "module", "value", "label", "sortOrder") AS (
  VALUES
    ('catalog_dispatch_category_otros', 'dispatch_category', 'DESPACHO', 'OTROS', 'Otros', 900),
    ('catalog_dispatch_area_catastro', 'dispatch_area', 'DESPACHO', 'CATASTRO', 'Catastro', 10),
    ('catalog_dispatch_area_hacienda', 'dispatch_area', 'DESPACHO', 'HACIENDA', 'Hacienda', 40),
    ('catalog_dispatch_area_policia_de_la_provincia', 'dispatch_area', 'DESPACHO', 'POLICIA_DE_LA_PROVINCIA', 'Policia de la Provincia', 80),
    ('catalog_dispatch_area_recursos_humanos', 'dispatch_area', 'DESPACHO', 'RECURSOS_HUMANOS', 'Recursos Humanos', 90),
    ('catalog_dispatch_area_saneamiento', 'dispatch_area', 'DESPACHO', 'SANEAMIENTO', 'Saneamiento', 100)
)
INSERT INTO "CatalogItem" (
  "id",
  "type",
  "module",
  "value",
  "label",
  "active",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  requested."id",
  requested."type",
  requested."module",
  requested."value",
  requested."label",
  true,
  requested."sortOrder",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM requested_options AS requested
WHERE NOT EXISTS (
  SELECT 1
  FROM "CatalogItem" AS catalog
  WHERE catalog."type" = requested."type"
    AND catalog."value" = requested."value"
);
