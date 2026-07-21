import type { CatalogItem, Prisma } from "@prisma/client";
import {
  CATALOG_SELECTOR_ITEMS,
  CATALOG_SELECTOR_TYPES,
  type CatalogSelectorItem,
} from "../src/lib/catalog-selector-definitions";

export type CatalogSelectorRecord = Pick<
  CatalogItem,
  "id" | "type" | "module" | "value" | "label" | "active" | "sortOrder" | "createdAt"
>;

type CanonicalUpdate = {
  id: string;
  data: Pick<CatalogSelectorItem, "module" | "label" | "sortOrder"> & { active: true };
};

export type CatalogSelectorSyncPlan = {
  creates: CatalogSelectorItem[];
  updates: CanonicalUpdate[];
  duplicateIdsToDeactivate: string[];
};

export type CatalogSelectorSyncSummary = {
  created: number;
  updated: number;
  deactivatedDuplicates: number;
  unchanged: number;
};

function catalogKey(type: string, value: string) {
  return `${type}\u0000${value}`;
}

function compareCanonicalCandidates(left: CatalogSelectorRecord, right: CatalogSelectorRecord) {
  const dateDifference = left.createdAt.getTime() - right.createdAt.getTime();
  return dateDifference || left.id.localeCompare(right.id);
}

export function planCatalogSelectorSync(
  existingItems: readonly CatalogSelectorRecord[],
): CatalogSelectorSyncPlan {
  const existingByKey = new Map<string, CatalogSelectorRecord[]>();

  for (const item of existingItems) {
    const key = catalogKey(item.type, item.value);
    const current = existingByKey.get(key) ?? [];
    current.push(item);
    existingByKey.set(key, current);
  }

  const creates: CatalogSelectorItem[] = [];
  const updates: CanonicalUpdate[] = [];
  const duplicateIdsToDeactivate: string[] = [];

  for (const expected of CATALOG_SELECTOR_ITEMS) {
    const matches = [...(existingByKey.get(catalogKey(expected.type, expected.value)) ?? [])].sort(
      compareCanonicalCandidates,
    );

    if (!matches.length) {
      creates.push({ ...expected });
      continue;
    }

    const [canonical, ...duplicates] = matches;
    if (
      canonical.module !== expected.module ||
      canonical.label !== expected.label ||
      canonical.sortOrder !== expected.sortOrder ||
      !canonical.active
    ) {
      updates.push({
        id: canonical.id,
        data: {
          module: expected.module,
          label: expected.label,
          sortOrder: expected.sortOrder,
          active: true,
        },
      });
    }

    duplicateIdsToDeactivate.push(...duplicates.filter((item) => item.active).map((item) => item.id));
  }

  return { creates, updates, duplicateIdsToDeactivate };
}

type CatalogSelectorClient = Pick<
  Prisma.TransactionClient,
  "catalogItem"
>;

export async function syncCatalogSelectors(
  client: CatalogSelectorClient,
): Promise<CatalogSelectorSyncSummary> {
  const existingItems = (await client.catalogItem.findMany({
    where: { type: { in: [...CATALOG_SELECTOR_TYPES] } },
    select: {
      id: true,
      type: true,
      module: true,
      value: true,
      label: true,
      active: true,
      sortOrder: true,
      createdAt: true,
    },
  })) as CatalogSelectorRecord[];

  const plan = planCatalogSelectorSync(existingItems);

  if (plan.creates.length) {
    await client.catalogItem.createMany({ data: plan.creates });
  }

  for (const update of plan.updates) {
    await client.catalogItem.update({ where: { id: update.id }, data: update.data });
  }

  if (plan.duplicateIdsToDeactivate.length) {
    await client.catalogItem.updateMany({
      where: { id: { in: plan.duplicateIdsToDeactivate } },
      data: { active: false },
    });
  }

  return {
    created: plan.creates.length,
    updated: plan.updates.length,
    deactivatedDuplicates: plan.duplicateIdsToDeactivate.length,
    unchanged: CATALOG_SELECTOR_ITEMS.length - plan.creates.length - plan.updates.length,
  };
}
