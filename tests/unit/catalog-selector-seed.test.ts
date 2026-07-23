import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AGENDA_VIEW_SCOPES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  CALENDAR_SCOPES,
} from "../../src/lib/appointment-constants";
import {
  CATALOG_SELECTOR_EXPECTED_COUNTS,
  CATALOG_SELECTOR_GROUPS,
  CATALOG_SELECTOR_ITEMS,
  CATALOG_SELECTOR_TOTAL,
  type CatalogSelectorItem,
} from "../../src/lib/catalog-selector-definitions";
import {
  ACTION_TYPES,
  COUNTERPART_TYPES,
  DISPATCH_INTERNAL_DERIVED_AREAS,
  DISPATCH_STATUSES,
  EXPEDIENT_AREAS,
  EXPEDIENT_STATUSES,
  JURIDICAL_DERIVED_AREAS,
  JURIDICAL_STATUSES,
  PRIORITIES,
  REFERRAL_STATUSES,
  ROLES,
} from "../../src/lib/constants";
import { CODIGOS_EXPEDIENTES } from "../../src/lib/constants/codigosExpedientes";
import {
  ACT_TYPES,
  BRANDS,
  COLORS,
  RETENTION_STATUSES,
  VEHICLE_TYPES,
} from "../../src/lib/retentions";
import {
  planCatalogSelectorSync,
  syncCatalogSelectors,
  type CatalogSelectorRecord,
} from "../../prisma/catalog-selector-sync";

function catalogRecord(
  item: CatalogSelectorItem,
  index: number,
  overrides: Partial<CatalogSelectorRecord> = {},
): CatalogSelectorRecord {
  return {
    id: `catalog-${index}`,
    type: item.type,
    module: item.module,
    value: item.value,
    label: item.label,
    active: true,
    sortOrder: item.sortOrder,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
    ...overrides,
  };
}

function assertNonEmptyUnique(name: string, values: readonly string[]) {
  assert.ok(values.length > 0, `${name} no puede quedar vacio.`);
  assert.equal(new Set(values).size, values.length, `${name} contiene valores duplicados.`);
  assert.ok(values.every((value) => value.trim().length > 0), `${name} contiene valores vacios.`);
}

test("define exactamente los 79 selectores de catalogo requeridos", () => {
  assert.equal(CATALOG_SELECTOR_ITEMS.length, CATALOG_SELECTOR_TOTAL);
  assert.equal(CATALOG_SELECTOR_TOTAL, 79);

  const keys = CATALOG_SELECTOR_ITEMS.map((item) => `${item.type}:${item.value}`);
  assertNonEmptyUnique("catalogos dependientes de base", keys);

  for (const group of CATALOG_SELECTOR_GROUPS) {
    assert.equal(group.options.length, CATALOG_SELECTOR_EXPECTED_COUNTS[group.type]);
    assert.deepEqual(
      CATALOG_SELECTOR_ITEMS.filter((item) => item.type === group.type).map((item) => item.sortOrder),
      group.options.map((_, index) => index + 1),
    );
  }

  const dispatchCategories = new Set(
    CATALOG_SELECTOR_ITEMS.filter((item) => item.type === "dispatch_category").map((item) => item.value),
  );
  assert.equal(dispatchCategories.has("DERIVACION_AREA"), false);

  const juridicalContexts = new Set(
    CATALOG_SELECTOR_ITEMS.filter((item) => item.type === "intervention_context").map((item) => item.value),
  );
  assert.equal(juridicalContexts.has("ORIENTACION"), true);
  assert.equal(juridicalContexts.has("CONTENCION"), true);
});

test("la sincronizacion es idempotente cuando el catalogo ya esta correcto", () => {
  const existing = CATALOG_SELECTOR_ITEMS.map((item, index) => catalogRecord(item, index));
  assert.deepEqual(planCatalogSelectorSync(existing), {
    creates: [],
    updates: [],
    duplicateIdsToDeactivate: [],
  });
});

test("ejecuta el seed dos veces sin duplicar ni modificar datos ajenos", async () => {
  const records: CatalogSelectorRecord[] = [
    {
      id: "custom-existing",
      type: "dispatch_category",
      module: "DESPACHO",
      value: "OPCION_PERSONALIZADA",
      label: "Opcion personalizada",
      active: true,
      sortOrder: 500,
      createdAt: new Date(Date.UTC(2025, 0, 1)),
    },
  ];
  const existingUser = { id: "user-existing", username: "usuario-real" };
  const existingExpedient = { id: "expedient-existing", category: "OPCION_PERSONALIZADA" };
  let nextId = 1;

  const catalogItem = {
    findMany: async () => records.map((record) => ({ ...record })),
    createMany: async ({ data }: { data: CatalogSelectorItem[] }) => {
      for (const item of data) {
        const created = catalogRecord(item, nextId, {
          id: `created-${nextId++}`,
          createdAt: new Date(Date.UTC(2026, 1, 1, 0, 0, nextId)),
        });
        records.push(created);
      }
      return { count: data.length };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<CatalogSelectorRecord>;
    }) => {
      const record = records.find((item) => item.id === where.id);
      assert.ok(record);
      Object.assign(record, data);
      return record;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: { in: string[] } };
      data: Partial<CatalogSelectorRecord>;
    }) => {
      const ids = new Set(where.id.in);
      const matches = records.filter((item) => ids.has(item.id));
      for (const record of matches) Object.assign(record, data);
      return { count: matches.length };
    },
  };
  const client = { catalogItem } as unknown as Parameters<typeof syncCatalogSelectors>[0];

  const firstRun = await syncCatalogSelectors(client);
  const secondRun = await syncCatalogSelectors(client);

  assert.deepEqual(firstRun, {
    created: 79,
    updated: 0,
    deactivatedDuplicates: 0,
    unchanged: 0,
  });
  assert.deepEqual(secondRun, {
    created: 0,
    updated: 0,
    deactivatedDuplicates: 0,
    unchanged: 79,
  });
  assert.equal(records.length, 80);
  assert.deepEqual(existingUser, { id: "user-existing", username: "usuario-real" });
  assert.deepEqual(existingExpedient, {
    id: "expedient-existing",
    category: "OPCION_PERSONALIZADA",
  });
  assert.equal(records.find((item) => item.id === "custom-existing")?.active, true);
});

test("crea faltantes, repara canonicos y desactiva duplicados sin tocar personalizados", () => {
  const [first, missing, ...remaining] = CATALOG_SELECTOR_ITEMS;
  const canonical = catalogRecord(first, 0, {
    id: "canonical-oldest",
    module: null,
    label: "Etiqueta incorrecta",
    active: false,
    sortOrder: 999,
  });
  const duplicate = catalogRecord(first, 1, {
    id: "canonical-duplicate",
    createdAt: new Date(Date.UTC(2026, 0, 2)),
  });
  const custom: CatalogSelectorRecord = {
    id: "custom-option",
    type: first.type,
    module: first.module,
    value: "OPCION_PERSONALIZADA",
    label: "Opcion personalizada",
    active: true,
    sortOrder: 500,
    createdAt: new Date(Date.UTC(2025, 0, 1)),
  };
  const existing = [
    canonical,
    duplicate,
    custom,
    ...remaining.map((item, index) => catalogRecord(item, index + 2)),
  ];

  const plan = planCatalogSelectorSync(existing);

  assert.deepEqual(plan.creates, [missing]);
  assert.deepEqual(plan.duplicateIdsToDeactivate, [duplicate.id]);
  assert.deepEqual(plan.updates, [
    {
      id: canonical.id,
      data: {
        module: first.module,
        label: first.label,
        sortOrder: first.sortOrder,
        active: true,
      },
    },
  ]);
  assert.equal(plan.updates.some((update) => update.id === custom.id), false);
  assert.equal(plan.duplicateIdsToDeactivate.includes(custom.id), false);
});

test("todos los selectores estaticos auditados tienen opciones unicas", () => {
  const selectors: Array<[string, readonly string[]]> = [
    ["roles", Object.values(ROLES)],
    ["alcances de agenda", CALENDAR_SCOPES],
    ["vistas de agenda", AGENDA_VIEW_SCOPES],
    ["tipos de agenda", APPOINTMENT_TYPES],
    ["estados de agenda", APPOINTMENT_STATUSES],
    ["estados de despacho", DISPATCH_STATUSES],
    ["estados juridicos", JURIDICAL_STATUSES],
    ["estados de expedientes", EXPEDIENT_STATUSES],
    ["prioridades", PRIORITIES],
    ["estados de derivacion", REFERRAL_STATUSES],
    ["tipos de contraparte", COUNTERPART_TYPES.map(([value]) => value)],
    ["tipos de accion", ACTION_TYPES],
    ["areas derivadas de juridico", JURIDICAL_DERIVED_AREAS],
    ["areas derivadas de despacho", DISPATCH_INTERNAL_DERIVED_AREAS.map((item) => item.value)],
    ["areas de expedientes", EXPEDIENT_AREAS.map((item) => item.value)],
    ["tipos de acta", ACT_TYPES.map(([value]) => value)],
    ["tipos de vehiculo", VEHICLE_TYPES.map(([value]) => value)],
    ["marcas", BRANDS],
    ["colores", COLORS],
    ["estados de retenciones", RETENTION_STATUSES.map(([value]) => value)],
    ["codigos de expedientes", CODIGOS_EXPEDIENTES.map((item) => item.codigo)],
  ];

  for (const [name, values] of selectors) assertNonEmptyUnique(name, values);
  assert.equal(CODIGOS_EXPEDIENTES.length, 292);
});

test("el seed predeterminado solo opera sobre CatalogItem y el demo exige confirmacion", () => {
  const safeSeedSource = readFileSync(new URL("../../prisma/seed.ts", import.meta.url), "utf8");
  const syncSource = readFileSync(
    new URL("../../prisma/catalog-selector-sync.ts", import.meta.url),
    "utf8",
  );
  const demoSeedSource = readFileSync(new URL("../../prisma/seed-demo.ts", import.meta.url), "utf8");
  const safeSources = `${safeSeedSource}\n${syncSource}`;

  assert.doesNotMatch(safeSources, /\.delete(?:Many)?\s*\(/);
  assert.doesNotMatch(
    safeSources,
    /\.(?:user|session|externalPerson|dispatchRecord|juridicalIntervention|internalExpedient|attachment)\./,
  );
  assert.match(syncSource, /client\.catalogItem\./);

  const guardPosition = demoSeedSource.indexOf("ALLOW_DESTRUCTIVE_DEMO_SEED");
  const firstDeletePosition = demoSeedSource.indexOf(".deleteMany(");
  assert.ok(guardPosition >= 0);
  assert.ok(firstDeletePosition > guardPosition);
});
