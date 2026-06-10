export const ACT_TYPES = [
  ["ALCOHOLEMIA", "Alcoholemia"],
  ["INFRACCION", "Infraccion"],
] as const;

export const VEHICLE_TYPES = [
  ["AUTO", "Auto"],
  ["CAMION", "Camion"],
  ["CAMIONETA", "Camioneta"],
  ["COLECTIVO", "Colectivo"],
  ["CUATRICICLO", "Cuatriciclo"],
  ["MOTO", "Moto"],
  ["OTRO", "Otro"],
] as const;

export const COLORS = [
  "Blanco",
  "Negro",
  "Rojo",
  "Azul",
  "Verde",
  "Amarillo",
  "Gris",
  "Marron",
  "Naranja",
  "Violeta",
  "Rosa",
  "Beige",
  "Otros",
] as const;

export const BRANDS = [
  "Alfa Romeo",
  "Appia",
  "Audi",
  "Bajaj",
  "Benelli",
  "Beta",
  "BMW",
  "Brava",
  "Chevrolet",
  "Chery",
  "Citroen",
  "Corven",
  "Ducati",
  "Fiat",
  "Ford",
  "Gilera",
  "Honda",
  "Hyundai",
  "Jeep",
  "Kawasaki",
  "Keller",
  "Kia",
  "KTM",
  "Mercedes-Benz",
  "Motomel",
  "Nissan",
  "Peugeot",
  "Renault",
  "Toyota",
  "Volkswagen",
  "Yamaha",
  "Zanella",
  "Otra",
] as const;

export const RETENTION_STATUSES = [
  ["PENDIENTE", "Pendiente"],
  ["ENTREGADO", "Entregado"],
] as const;

export const RETENTION_FILTER_KEYS = [
  "from",
  "to",
  "actNumber",
  "actType",
  "recordNumber",
  "domain",
  "engineNumber",
  "chassisNumber",
  "vehicleType",
  "brand",
  "color",
  "status",
] as const;

export const RETENTION_FIELD_LABELS = {
  actNumber: "Nro de acta",
  actType: "Tipo de acta",
  recordNumber: "Legajo",
  domain: "Dominio",
  engineNumber: "Nro de motor",
  chassisNumber: "Nro de chasis",
  vehicleType: "Vehiculo",
  brand: "Marca",
  color: "Color",
  description: "Observaciones",
  status: "Estado",
} as const;

export type RetentionStatus = (typeof RETENTION_STATUSES)[number][0];
export type RetentionField = keyof typeof RETENTION_FIELD_LABELS;

export type RetentionInput = {
  actNumber: string;
  actType: string;
  recordNumber: string;
  domain: string;
  engineNumber: string;
  chassisNumber: string;
  vehicleType: string;
  brand: string;
  color: string;
  description: string;
  status: RetentionStatus;
};

export function optionLabel(options: ReadonlyArray<readonly [string, string]>, value: string) {
  return options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

export function uppercaseIdentifier(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function normalizeOptionalIdentifier(value: string | null | undefined) {
  const normalized = uppercaseIdentifier(value ?? "");
  return normalized.length ? normalized : null;
}

export function displayRetentionValue(field: RetentionField, value: string | null | undefined) {
  if (!value) return "N/A";
  if (field === "actType") return optionLabel(ACT_TYPES, value);
  if (field === "vehicleType") return optionLabel(VEHICLE_TYPES, value);
  if (field === "status") return optionLabel(RETENTION_STATUSES, value);
  return value;
}
