import {
  DISPATCH_CATEGORY_LABELS,
  DISPATCH_FORM_EXCLUDED_CATEGORIES,
  EXPEDIENT_CATEGORY_LABELS,
  JURIDICAL_CONTEXT_LABELS,
  JURIDICAL_TYPE_LABELS,
} from "./constants";

export const CATALOG_SELECTOR_TYPES = [
  "dispatch_category",
  "dispatch_area",
  "juridical_type",
  "intervention_context",
  "expedient_category",
] as const;

export type CatalogSelectorType = (typeof CATALOG_SELECTOR_TYPES)[number];

export type CatalogSelectorOption = {
  value: string;
  label: string;
};

export type CatalogSelectorItem = CatalogSelectorOption & {
  type: CatalogSelectorType;
  module: "DESPACHO" | "JURIDICO";
  sortOrder: number;
};

function optionsFromLabels(
  labels: Record<string, string>,
  excludedValues: readonly string[] = [],
): CatalogSelectorOption[] {
  const excluded = new Set(excludedValues);
  return Object.entries(labels)
    .filter(([value]) => !excluded.has(value))
    .map(([value, label]) => ({ value, label }));
}

const dispatchAreaOptions: CatalogSelectorOption[] = [
  { value: "CATASTRO", label: "Catastro" },
  { value: "DEFENSA_CIVIL", label: "Defensa Civil" },
  { value: "DESARROLLO_SOCIAL", label: "Desarrollo Social" },
  { value: "HACIENDA", label: "Hacienda" },
  { value: "HONORABLE_TRIBUNAL_DE_FALTA", label: "Honorable tribunal de falta" },
  { value: "OBRAS_PUBLICAS", label: "Obras Publicas" },
  { value: "OFICIOS_JUDICIALES", label: "Oficios judiciales" },
  { value: "POLICIA_DE_LA_PROVINCIA", label: "Policia de la Provincia" },
  { value: "RECURSOS_HUMANOS", label: "Recursos Humanos" },
  { value: "SANEAMIENTO", label: "Saneamiento" },
  { value: "SERVICIOS_URBANOS", label: "Servicios Urbanos" },
  { value: "TRANSITO", label: "Transito" },
];

export const CATALOG_SELECTOR_GROUPS: ReadonlyArray<{
  type: CatalogSelectorType;
  module: CatalogSelectorItem["module"];
  options: readonly CatalogSelectorOption[];
}> = [
  {
    type: "dispatch_category",
    module: "DESPACHO",
    options: optionsFromLabels(DISPATCH_CATEGORY_LABELS, DISPATCH_FORM_EXCLUDED_CATEGORIES),
  },
  { type: "dispatch_area", module: "DESPACHO", options: dispatchAreaOptions },
  {
    type: "juridical_type",
    module: "JURIDICO",
    options: optionsFromLabels(JURIDICAL_TYPE_LABELS),
  },
  {
    type: "intervention_context",
    module: "JURIDICO",
    options: optionsFromLabels(JURIDICAL_CONTEXT_LABELS),
  },
  {
    type: "expedient_category",
    module: "DESPACHO",
    options: optionsFromLabels(EXPEDIENT_CATEGORY_LABELS),
  },
];

export const CATALOG_SELECTOR_ITEMS: readonly CatalogSelectorItem[] = CATALOG_SELECTOR_GROUPS.flatMap(
  ({ type, module, options }) =>
    options.map((option, index) => ({
      type,
      module,
      value: option.value,
      label: option.label,
      sortOrder: index + 1,
    })),
);

export const CATALOG_SELECTOR_EXPECTED_COUNTS: Readonly<Record<CatalogSelectorType, number>> = {
  dispatch_category: 8,
  dispatch_area: 12,
  juridical_type: 17,
  intervention_context: 13,
  expedient_category: 29,
};

export const CATALOG_SELECTOR_TOTAL = 79;
