"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Edit3, Eye, FileText, Plus, Upload } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { cn } from "@/components/ui/cn";

const ACT_TYPES = [
  ["ALCOHOLEMIA", "Alcoholemia"],
  ["INFRACCION", "Infraccion"],
] as const;

const VEHICLE_TYPES = [
  ["AUTO", "Auto"],
  ["CAMION", "Camion"],
  ["CAMIONETA", "Camioneta"],
  ["COLECTIVO", "Colectivo"],
  ["CUATRICICLO", "Cuatriciclo"],
  ["MOTO", "Moto"],
  ["OTRO", "Otro"],
] as const;

const COLORS = ["Blanco", "Negro", "Rojo", "Azul", "Verde", "Amarillo", "Gris", "Marron", "Naranja", "Violeta", "Rosa", "Beige", "Otros"];

const BRANDS = [
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
];

const RETENTION_STATUSES = [
  ["PENDIENTE", "Pendiente"],
  ["ENTREGADO", "Entregado"],
] as const;

type RetentionStatus = (typeof RETENTION_STATUSES)[number][0];

type RetentionRecord = {
  id: number;
  dateTime: string;
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
  createdBy: string;
  histories: RetentionHistory[];
};

type RetentionHistory = {
  id: string;
  field: keyof RetentionInput;
  oldValue: string;
  newValue: string;
  editedBy: string;
  editedAt: string;
};

type RetentionInput = {
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

type RetentionFilters = Partial<Record<"from" | "to" | keyof RetentionInput, string>>;

type PickedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
};

const MOCK_RETENTIONS: RetentionRecord[] = [
  {
    id: 184,
    dateTime: "2026-06-07T18:35:00.000Z",
    actNumber: "1287",
    actType: "ALCOHOLEMIA",
    recordNumber: "4421",
    domain: "AB123CD",
    engineNumber: "",
    chassisNumber: "",
    vehicleType: "AUTO",
    brand: "Toyota",
    color: "Gris",
    description: "Control preventivo con resultado positivo. Vehiculo trasladado al corralon municipal.",
    status: "PENDIENTE",
    createdBy: "Marta Acosta",
    histories: [],
  },
  {
    id: 183,
    dateTime: "2026-06-06T22:10:00.000Z",
    actNumber: "1286",
    actType: "INFRACCION",
    recordNumber: "4419",
    domain: "A112BCD",
    engineNumber: "",
    chassisNumber: "8AJBA3CD4E1234567",
    vehicleType: "CAMIONETA",
    brand: "Ford",
    color: "Blanco",
    description: "Retencion por falta de documentacion obligatoria durante operativo nocturno.",
    status: "ENTREGADO",
    createdBy: "Diego Rivas",
    histories: [
      {
        id: "hist-183-1",
        field: "status",
        oldValue: "Pendiente",
        newValue: "Entregado",
        editedBy: "Sergio Molina",
        editedAt: "2026-06-08T10:20:00.000Z",
      },
    ],
  },
  {
    id: 182,
    dateTime: "2026-06-05T13:25:00.000Z",
    actNumber: "1285",
    actType: "INFRACCION",
    recordNumber: "4415",
    domain: "",
    engineNumber: "E3J739502",
    chassisNumber: "9C2KC2200MR000182",
    vehicleType: "MOTO",
    brand: "Honda",
    color: "Negro",
    description: "Motovehiculo retenido por circular sin dominio visible y sin documentacion respaldatoria.",
    status: "PENDIENTE",
    createdBy: "Paola Nunez",
    histories: [],
  },
];

const FILTER_KEYS = [
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

const HISTORY_FIELDS: Array<keyof RetentionInput> = [
  "actNumber",
  "actType",
  "recordNumber",
  "domain",
  "engineNumber",
  "chassisNumber",
  "vehicleType",
  "brand",
  "color",
  "description",
  "status",
];

const FIELD_LABELS: Record<keyof RetentionInput, string> = {
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
};

function optionLabel(options: ReadonlyArray<readonly [string, string]>, value: string) {
  return options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const argentinaDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const day = String(argentinaDate.getUTCDate()).padStart(2, "0");
  const month = String(argentinaDate.getUTCMonth() + 1).padStart(2, "0");
  const year = String(argentinaDate.getUTCFullYear()).slice(-2);
  const hours = String(argentinaDate.getUTCHours()).padStart(2, "0");
  const minutes = String(argentinaDate.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.ceil(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function textFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function uppercaseIdentifier(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function cleanFilters(formData: FormData) {
  const filters: RetentionFilters = {};
  FILTER_KEYS.forEach((key) => {
    const value = textFromForm(formData, key);
    if (value) filters[key] = ["domain", "engineNumber", "chassisNumber"].includes(key) ? uppercaseIdentifier(value) : value;
  });
  return filters;
}

function recordMatchesFilters(record: RetentionRecord, filters: RetentionFilters) {
  const recordDate = record.dateTime.slice(0, 10);
  if (filters.from && recordDate < filters.from) return false;
  if (filters.to && recordDate > filters.to) return false;
  if (filters.actNumber && !record.actNumber.includes(filters.actNumber)) return false;
  if (filters.actType && record.actType !== filters.actType) return false;
  if (filters.recordNumber && !record.recordNumber.includes(filters.recordNumber)) return false;
  if (filters.domain && !record.domain.includes(filters.domain)) return false;
  if (filters.engineNumber && !record.engineNumber.includes(filters.engineNumber)) return false;
  if (filters.chassisNumber && !record.chassisNumber.includes(filters.chassisNumber)) return false;
  if (filters.vehicleType && record.vehicleType !== filters.vehicleType) return false;
  if (filters.brand && record.brand !== filters.brand) return false;
  if (filters.color && record.color !== filters.color) return false;
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

function retentionInputFromForm(formData: FormData): RetentionInput {
  return {
    actNumber: textFromForm(formData, "actNumber"),
    actType: textFromForm(formData, "actType"),
    recordNumber: textFromForm(formData, "recordNumber"),
    domain: uppercaseIdentifier(textFromForm(formData, "domain")),
    engineNumber: uppercaseIdentifier(textFromForm(formData, "engineNumber")),
    chassisNumber: uppercaseIdentifier(textFromForm(formData, "chassisNumber")),
    vehicleType: textFromForm(formData, "vehicleType"),
    brand: textFromForm(formData, "brand"),
    color: textFromForm(formData, "color"),
    description: textFromForm(formData, "description"),
    status: (textFromForm(formData, "status") || "PENDIENTE") as RetentionStatus,
  };
}

function displayFieldValue(field: keyof RetentionInput, value: string) {
  if (!value) return "N/A";
  if (field === "actType") return optionLabel(ACT_TYPES, value);
  if (field === "vehicleType") return optionLabel(VEHICLE_TYPES, value);
  if (field === "status") return optionLabel(RETENTION_STATUSES, value);
  return value;
}

function RetentionForm({
  initial,
  onCancel,
  onSave,
  submitLabel,
}: {
  initial?: RetentionRecord;
  onCancel: () => void;
  onSave: (input: RetentionInput) => void;
  submitLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = retentionInputFromForm(new FormData(event.currentTarget));
    const hasIdentifier = Boolean(input.domain || input.engineNumber || input.chassisNumber);
    if (!hasIdentifier) {
      setError("Completa al menos dominio, motor o chasis.");
      return;
    }
    setError(null);
    onSave(input);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}
      <FormGrid>
        <FormField label="Nro de acta">
          <input name="actNumber" type="number" min="0" step="1" defaultValue={initial?.actNumber} required className={inputClass} />
        </FormField>
        <FormField label="Tipo de acta">
          <select name="actType" defaultValue={initial?.actType ?? ""} required className={inputClass}>
            <option value="">Seleccione tipo</option>
            {ACT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Legajo">
          <input name="recordNumber" type="number" min="0" step="1" defaultValue={initial?.recordNumber} required className={inputClass} />
        </FormField>
        <FormField label="Dominio">
          <input name="domain" defaultValue={initial?.domain} className={inputClass} />
        </FormField>
        <FormField label="Nro de motor">
          <input name="engineNumber" defaultValue={initial?.engineNumber} className={inputClass} />
        </FormField>
        <FormField label="Nro de chasis">
          <input name="chassisNumber" defaultValue={initial?.chassisNumber} className={inputClass} />
        </FormField>
        <FormField label="Vehiculo">
          <select name="vehicleType" defaultValue={initial?.vehicleType ?? ""} required className={inputClass}>
            <option value="">Seleccione vehiculo</option>
            {VEHICLE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Marca">
          <select name="brand" defaultValue={initial?.brand ?? ""} required className={inputClass}>
            <option value="">Seleccione marca</option>
            {BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Color">
          <select name="color" defaultValue={initial?.color ?? ""} required className={inputClass}>
            <option value="">Seleccione color</option>
            {COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Estado">
          <select name="status" defaultValue={initial?.status ?? "PENDIENTE"} required className={inputClass}>
            {RETENTION_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Observaciones" className="md:col-span-2">
          <textarea name="description" defaultValue={initial?.description} required className={textareaClass} />
        </FormField>
      </FormGrid>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#dee2e6] pt-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="success">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function RetentionDetails({ record }: { record: RetentionRecord }) {
  const deliveredBy = record.histories.find((history) => history.field === "status" && history.newValue === "Entregado");

  return (
    <div className="space-y-4">
      <section className="grid gap-3 rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3 text-sm md:grid-cols-2">
        <p>
          <strong>Acta:</strong> {optionLabel(ACT_TYPES, record.actType)} Nro {record.actNumber}
        </p>
        <p>
          <strong>Legajo:</strong> {record.recordNumber}
        </p>
        <p>
          <strong>Dominio:</strong> {record.domain || "N/A"}
        </p>
        <p>
          <strong>Motor:</strong> {record.engineNumber || "N/A"}
        </p>
        <p>
          <strong>Chasis:</strong> {record.chassisNumber || "N/A"}
        </p>
        <p>
          <strong>Vehiculo:</strong> {optionLabel(VEHICLE_TYPES, record.vehicleType)} / {record.brand} / {record.color}
        </p>
        <p>
          <strong>Cargado por:</strong> {record.createdBy}
        </p>
        <p>
          <strong>Fecha:</strong> {formatDateTime(record.dateTime)}
        </p>
        <p className="md:col-span-2">
          <strong>Observaciones:</strong> {record.description}
        </p>
        <div className="md:col-span-2">
          <strong className="mr-2">Estado:</strong>
          <StatusBadge value={record.status} />
          {deliveredBy ? <span className="ml-2 text-xs text-[#6c757d]">Entregado por {deliveredBy.editedBy}</span> : null}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[#212529]">Historial de edicion</h3>
        <Table headers={["Campo", "Valor anterior", "Valor nuevo", "Editado por", "Fecha"]} empty={!record.histories.length} minWidth={760}>
          {record.histories.map((history) => (
            <tr key={history.id}>
              <Td>{FIELD_LABELS[history.field]}</Td>
              <Td>{history.oldValue}</Td>
              <Td>{history.newValue}</Td>
              <Td>{history.editedBy}</Td>
              <Td>{formatDateTime(history.editedAt)}</Td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}

function FileUploadPanel({ files, onFilesPicked }: { files: PickedFile[]; onFilesPicked: (files: File[]) => void }) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFilesPicked(Array.from(event.target.files ?? []));
    event.currentTarget.value = "";
  }

  return (
    <section className="mt-4 rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#212529]">
          <FileText className="h-4 w-4 text-[#0667b0]" />
          Imagenes / archivos
        </div>
        <label className="inline-flex min-h-9 max-w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-[#0667b0] bg-[#0667b0] px-3 py-1.5 text-center text-sm font-semibold leading-tight text-white shadow-sm transition duration-150 hover:border-[#0a61b9] hover:bg-[#0a61b9] focus-within:ring-2 focus-within:ring-[#80bdff]">
          <Upload className="h-4 w-4" />
          Subir imagenes / archivos
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="sr-only" onChange={handleChange} />
        </label>
      </div>
      <div className="p-3">
        {files.length ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {files.map((file) => (
              <div key={file.id} className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] px-3 py-2 text-sm">
                <div className="font-semibold text-[#212529] [overflow-wrap:anywhere]">{file.name}</div>
                <div className="mt-1 text-xs font-medium text-[#6c757d]">
                  {formatFileSize(file.size)} · {file.type || "application/octet-stream"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-[#6c757d]">Sin archivos seleccionados.</p>
        )}
      </div>
    </section>
  );
}

export function RetentionsClient({ currentUserName }: { currentUserName: string }) {
  const [retentions, setRetentions] = useState<RetentionRecord[]>(MOCK_RETENTIONS);
  const [filters, setFilters] = useState<RetentionFilters>({});
  const [filterRenderKey, setFilterRenderKey] = useState(0);
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);

  const filteredRetentions = useMemo(
    () => retentions.filter((record) => recordMatchesFilters(record, filters)),
    [filters, retentions],
  );
  const hasActiveFilters = Object.keys(filters).length > 0;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(cleanFilters(new FormData(event.currentTarget)));
    setFilterRenderKey((current) => current + 1);
  }

  function clearFilters() {
    setFilters({});
    setFilterRenderKey((current) => current + 1);
  }

  function addRetention(input: RetentionInput, close: () => void) {
    const nextId = Math.max(...retentions.map((record) => record.id), 0) + 1;
    setRetentions((current) => [
      {
        id: nextId,
        dateTime: new Date().toISOString(),
        createdBy: currentUserName,
        histories: [],
        ...input,
      },
      ...current,
    ]);
    close();
  }

  function updateRetention(id: number, input: RetentionInput, close: () => void) {
    setRetentions((current) =>
      current.map((record) => {
        if (record.id !== id) return record;
        const histories = HISTORY_FIELDS.flatMap((field) => {
          const oldValue = record[field] ?? "";
          const newValue = input[field] ?? "";
          if (oldValue === newValue) return [];
          return [
            {
              id: `${record.id}-${field}-${Date.now()}`,
              field,
              oldValue: displayFieldValue(field, oldValue),
              newValue: displayFieldValue(field, newValue),
              editedBy: currentUserName,
              editedAt: new Date().toISOString(),
            },
          ];
        });
        return { ...record, ...input, histories: [...record.histories, ...histories] };
      }),
    );
    close();
  }

  function addPickedFiles(files: File[]) {
    if (!files.length) return;
    setPickedFiles((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      })),
    ]);
  }

  return (
    <>
      <PageHeader
        title="Retenciones / actas"
        description="Registro operativo de actas de retencion vehicular, identificadores, estado y documentacion asociada."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Retenciones / actas" }]}
        actions={
          <AppModal title="Nueva retencion" trigger={<><Plus className="h-4 w-4" />Nueva retencion</>} size="xl" triggerVariant="success">
            {({ close }) => (
              <RetentionForm submitLabel="Crear retencion" onCancel={close} onSave={(input) => addRetention(input, close)} />
            )}
          </AppModal>
        }
      />

      <div key={filterRenderKey}>
        <FilterBar resetHref="/retenciones" onSubmit={applyFilters} onClear={clearFilters}>
          <FilterInput label="Desde" name="from" type="date" defaultValue={filters.from} />
          <FilterInput label="Hasta" name="to" type="date" defaultValue={filters.to} />
          <FilterInput label="Nro de acta" name="actNumber" defaultValue={filters.actNumber} />
          <FilterSelect label="Tipo de acta" name="actType" defaultValue={filters.actType} options={ACT_TYPES.map(([value, label]) => [value, label])} />
          <FilterInput label="Legajo" name="recordNumber" defaultValue={filters.recordNumber} />
          <FilterInput label="Dominio" name="domain" defaultValue={filters.domain} />
          <FilterInput label="Nro de motor" name="engineNumber" defaultValue={filters.engineNumber} />
          <FilterInput label="Nro de chasis" name="chassisNumber" defaultValue={filters.chassisNumber} />
          <FilterSelect label="Vehiculo" name="vehicleType" defaultValue={filters.vehicleType} options={VEHICLE_TYPES.map(([value, label]) => [value, label])} />
          <FilterSelect label="Marca" name="brand" defaultValue={filters.brand} options={BRANDS} />
          <FilterSelect label="Color" name="color" defaultValue={filters.color} options={COLORS} />
          <FilterSelect label="Estado" name="status" defaultValue={filters.status} options={RETENTION_STATUSES.map(([value, label]) => [value, label])} />
        </FilterBar>
      </div>

      <div className="mb-2 flex flex-col gap-1 text-sm text-[#495057] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">Fecha de inicio: 11 de Octubre de 2024</p>
        <p>
          {hasActiveFilters ? "Retenciones filtradas" : "Total de retenciones"}: <strong>{filteredRetentions.length}</strong>
          {filteredRetentions.length !== retentions.length ? ` de ${retentions.length}` : ""}
        </p>
      </div>

      <Table headers={["Fecha y hora", "Tipo de acta / Nro", "Identificador", "Vehiculo / Marca / Color", "Estado", "Acciones"]} empty={!filteredRetentions.length} minWidth={1180}>
        {filteredRetentions.map((record) => (
          <tr key={record.id}>
            <Td>
              <div className="font-medium">{formatDateTime(record.dateTime)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">Registro #{record.id}</div>
            </Td>
            <Td>
              <div className="font-medium">{optionLabel(ACT_TYPES, record.actType)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">Nro: {record.actNumber} · Legajo: {record.recordNumber}</div>
            </Td>
            <Td>
              <IdentifierLine label="Dominio" value={record.domain} />
              <IdentifierLine label="Motor" value={record.engineNumber} />
              <IdentifierLine label="Chasis" value={record.chassisNumber} />
            </Td>
            <Td>
              <div className="font-medium">{optionLabel(VEHICLE_TYPES, record.vehicleType)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">{record.brand} · {record.color}</div>
            </Td>
            <Td>
              <StatusBadge value={record.status} />
              <div className="mt-1 text-xs text-[#6c757d]">Cargado por: {record.createdBy}</div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <AppModal title={`Detalle retencion #${record.id}`} trigger={<><Eye className="h-4 w-4" />Ver</>} triggerVariant="secondary" size="lg">
                  <RetentionDetails record={record} />
                </AppModal>
                <AppModal title={`Editar retencion #${record.id}`} trigger={<><Edit3 className="h-4 w-4" />Editar</>} triggerVariant="secondary" size="xl">
                  {({ close }) => (
                    <RetentionForm
                      initial={record}
                      submitLabel="Guardar cambios"
                      onCancel={close}
                      onSave={(input) => updateRetention(record.id, input, close)}
                    />
                  )}
                </AppModal>
              </div>
            </Td>
          </tr>
        ))}
      </Table>

      <FileUploadPanel files={pickedFiles} onFilesPicked={addPickedFiles} />
    </>
  );
}

function IdentifierLine({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("text-xs leading-5", value ? "text-[#212529]" : "text-[#6c757d]")}>
      <span className="font-semibold">{label}:</span> {value || "N/A"}
    </div>
  );
}
