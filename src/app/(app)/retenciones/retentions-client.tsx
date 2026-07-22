"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit3, Eye, Plus, Trash2 } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { cn } from "@/components/ui/cn";
import { SelectedFilesInput } from "@/components/ui/selected-files-input";
import { sortByLabel } from "@/lib/text";
import { parseArgentinaDate } from "@/lib/argentina-time";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  ACT_TYPES,
  BRANDS,
  COLORS,
  RETENTION_FIELD_LABELS,
  RETENTION_FILTER_KEYS,
  RETENTION_STATUSES,
  VEHICLE_TYPES,
  optionLabel,
  uppercaseIdentifier,
  type RetentionField,
  type RetentionInput,
  type RetentionStatus,
} from "@/lib/retentions";

type RetentionRecord = RetentionInput & {
  id: string;
  internalNumber: string;
  dateTime: string;
  createdBy: string;
  historyCount: number;
  attachmentCount: number;
};

type RetentionHistory = {
  id: string;
  field: RetentionField;
  oldValue: string;
  newValue: string;
  editedBy: string;
  editedAt: string;
};

type RetentionAttachment = {
  id: string;
  downloadUrl: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
};

type RetentionDetail = RetentionRecord & {
  histories: RetentionHistory[];
  attachments: RetentionAttachment[];
};

type RetentionFilters = Partial<Record<(typeof RETENTION_FILTER_KEYS)[number], string>>;

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.ceil(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateOnly(value: string) {
  if (!value) return "-";
  return formatDate(parseArgentinaDate(value));
}

function textFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function cleanFilters(formData: FormData) {
  const filters: RetentionFilters = {};
  RETENTION_FILTER_KEYS.forEach((key) => {
    const value = textFromForm(formData, key);
    if (value) filters[key] = ["domain", "engineNumber", "chassisNumber"].includes(key) ? uppercaseIdentifier(value) : value;
  });
  return filters;
}

function retentionInputFromForm(formData: FormData): RetentionInput {
  return {
    actCreatedAt: textFromForm(formData, "actCreatedAt"),
    sentToTribunalAt: textFromForm(formData, "sentToTribunalAt"),
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

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo completar la accion.");
  return data as T;
}

function RetentionForm({
  initial,
  onAttachmentChange,
  onCancel,
  onSave,
  submitLabel,
}: {
  initial?: RetentionRecord;
  onAttachmentChange?: (item: RetentionDetail) => void;
  onCancel: () => void;
  onSave: (input: RetentionInput, uploadSessionIds: string[]) => Promise<void>;
  submitLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<RetentionAttachment[]>([]);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!initial?.id) return;
    let ignore = false;
    apiJson<{ item: RetentionDetail }>(`/api/retenciones/${initial.id}`)
      .then((data) => {
        if (!ignore) setExistingAttachments(data.item.attachments);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudieron cargar los archivos.");
      });
    return () => {
      ignore = true;
    };
  }, [initial?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = retentionInputFromForm(formData);
    const uploadSessionIds = formData
      .getAll("uploadSessionIds")
      .filter((value): value is string => typeof value === "string" && Boolean(value));
    const hasIdentifier = Boolean(input.domain || input.engineNumber || input.chassisNumber);
    if (!hasIdentifier) {
      setError("Completa al menos dominio, motor o chasis.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(input, uploadSessionIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la retencion.");
      setSaving(false);
    }
  }

  async function deleteAttachment(attachment: RetentionAttachment) {
    if (!initial) return;
    setDeletingAttachmentId(attachment.id);
    setError(null);
    try {
      const data = await apiJson<{ item: RetentionDetail }>(
        `/api/retenciones/${initial.id}/archivos/${attachment.id}`,
        { method: "DELETE" },
      );
      setExistingAttachments(data.item.attachments);
      onAttachmentChange?.(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el archivo.");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  const sortedBrands = sortByLabel(BRANDS, (brand) => brand);
  const sortedColors = sortByLabel(COLORS, (color) => color);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}
      <FormGrid>
        <FormField label="Fecha de creacion del acta">
          <input name="actCreatedAt" type="date" defaultValue={initial?.actCreatedAt} className={inputClass} />
        </FormField>
        <FormField label="Fecha de envio al tribunal de falta">
          <input name="sentToTribunalAt" type="date" defaultValue={initial?.sentToTribunalAt} className={inputClass} />
        </FormField>
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
            {sortedBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Color">
          <select name="color" defaultValue={initial?.color ?? ""} className={inputClass}>
            <option value="">Sin especificar</option>
            {sortedColors.map((color) => (
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
          <textarea name="description" defaultValue={initial?.description} className={textareaClass} />
        </FormField>
        <FormField label="Adjuntos" className="md:col-span-2">
          <SelectedFilesInput
            intent={{
              module: "RETENCIONES",
              entityType: "Retention",
              ...(initial ? { scopeId: initial.id } : {}),
            }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
        </FormField>
      </FormGrid>
      {existingAttachments.length ? (
        <section className="space-y-2 rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3">
          <h3 className="text-sm font-semibold text-[#212529]">Archivos asociados</h3>
          <AttachmentGrid
            attachments={existingAttachments}
            deletingId={deletingAttachmentId}
            onDelete={initial ? deleteAttachment : undefined}
          />
        </section>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#dee2e6] pt-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="success" disabled={saving}>
          {saving ? (
            <>
              <Spinner />
              Guardando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

function RetentionDetailsPanel({ record }: { record: RetentionRecord }) {
  const [detail, setDetail] = useState<RetentionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    apiJson<{ item: RetentionDetail }>(`/api/retenciones/${record.id}`)
      .then((data) => {
        if (!ignore) setDetail(data.item);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudo cargar el detalle.");
      });
    return () => {
      ignore = true;
    };
  }, [record.id]);

  const current = detail ?? { ...record, histories: [], attachments: [] };
  const deliveredBy = current.histories.find((history) => history.field === "status" && history.newValue === "Entregado");

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}
      {!detail && !error ? <div className="text-sm font-medium text-[#212529]">Cargando detalle...</div> : null}

      <section className="grid gap-3 rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3 text-sm md:grid-cols-2">
        <p>
          <strong>Acta:</strong> {optionLabel(ACT_TYPES, current.actType)} Nro {current.actNumber}
        </p>
        <p>
          <strong>Legajo:</strong> {current.recordNumber}
        </p>
        <p>
          <strong>Fecha de creacion del acta:</strong> {formatDateOnly(current.actCreatedAt)}
        </p>
        <p>
          <strong>Fecha de envio al tribunal de falta:</strong> {formatDateOnly(current.sentToTribunalAt)}
        </p>
        <p>
          <strong>Dominio:</strong> {current.domain || "N/A"}
        </p>
        <p>
          <strong>Motor:</strong> {current.engineNumber || "N/A"}
        </p>
        <p>
          <strong>Chasis:</strong> {current.chassisNumber || "N/A"}
        </p>
        <p>
          <strong>Vehiculo:</strong> {optionLabel(VEHICLE_TYPES, current.vehicleType)} / {current.brand} / {current.color || "Sin color"}
        </p>
        <p>
          <strong>Cargado por:</strong> {current.createdBy}
        </p>
        <p>
          <strong>Fecha:</strong> {formatDateTime(current.dateTime)}
        </p>
        <p className="md:col-span-2">
          <strong>Observaciones:</strong> {current.description || "-"}
        </p>
        <div className="md:col-span-2">
          <strong className="mr-2">Estado:</strong>
          <StatusBadge value={current.status} />
          {deliveredBy ? <span className="ml-2 text-xs text-[#212529]">Entregado por {deliveredBy.editedBy}</span> : null}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[#212529]">Historial de edicion</h3>
        <Table
          title="Historial de edición"
          itemLabel="cambios"
          total={current.histories.length}
          showPagination={false}
          headers={["Campo", "Valor anterior", "Valor nuevo", "Editado por", "Fecha"]}
          empty={!current.histories.length}
          minWidth={760}
        >
          {current.histories.map((history) => (
            <tr key={history.id}>
              <Td>{RETENTION_FIELD_LABELS[history.field] ?? history.field}</Td>
              <Td>{history.oldValue}</Td>
              <Td>{history.newValue}</Td>
              <Td>{history.editedBy}</Td>
              <Td>{formatDateTime(history.editedAt)}</Td>
            </tr>
          ))}
        </Table>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[#212529]">Archivos</h3>
        <AttachmentGrid attachments={current.attachments} />
      </section>
    </div>
  );
}

function AttachmentGrid({
  attachments,
  onDelete,
  deletingId,
}: {
  attachments: RetentionAttachment[];
  onDelete?: (attachment: RetentionAttachment) => void;
  deletingId?: string | null;
}) {
  if (!attachments.length) return <p className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3 text-sm font-medium text-[#212529]">Sin archivos cargados.</p>;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {attachments.map((file) => (
        <div key={file.id} className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] px-3 py-2 text-sm">
          <a
            href={file.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="block transition duration-150 hover:text-[#064f87]"
          >
            <div className="font-semibold text-[#0667b0] [overflow-wrap:anywhere]">{file.originalName || file.fileName}</div>
            <div className="mt-1 text-xs font-medium text-[#212529]">
              {formatFileSize(file.size)} - {file.mimeType || "application/octet-stream"}
            </div>
            <div className="mt-1 text-xs font-medium text-[#212529]">
              {file.uploadedBy} - {formatDateTime(file.createdAt)}
            </div>
          </a>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(file)}
              disabled={deletingId === file.id}
              className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-[#dc3545] bg-white px-2 text-xs font-semibold text-[#c82333] transition hover:bg-[#f8d7da] disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletingId === file.id ? "Quitando..." : "Quitar"}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function RetentionsClient() {
  const [retentions, setRetentions] = useState<RetentionRecord[]>([]);
  const [filters, setFilters] = useState<RetentionFilters>({});
  const [filterRenderKey, setFilterRenderKey] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasActiveFilters = Object.keys(filters).length > 0;
  const pageSize = 10;

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters, page]);

  const refreshRetentions = useCallback(() => setRefreshKey((current) => current + 1), []);

  useEffect(() => {
    let ignore = false;
    apiJson<{ items: RetentionRecord[]; total: number }>(`/api/retenciones?${queryString}`)
      .then((data) => {
        if (!ignore) {
          setRetentions(data.items);
          setTotal(data.total);
          if (data.total > 0 && data.items.length === 0 && page > 1) setPage(1);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudieron cargar las retenciones.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, queryString, refreshKey]);

  const refreshList = useCallback(() => {
    setLoading(true);
    setError(null);
    refreshRetentions();
  }, [refreshRetentions]);

  const resetAndRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setPage(1);
    setFilters({});
    setFilterRenderKey((current) => current + 1);
    refreshRetentions();
  }, [refreshRetentions]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPage(1);
    setFilters(cleanFilters(new FormData(event.currentTarget)));
    setFilterRenderKey((current) => current + 1);
  }

  function clearFilters() {
    setLoading(true);
    setError(null);
    setPage(1);
    setFilters({});
    setFilterRenderKey((current) => current + 1);
  }

  async function addRetention(input: RetentionInput, uploadSessionIds: string[], close: () => void) {
    await apiJson<{ item: RetentionDetail }>("/api/retenciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, uploadSessionIds }),
    });
    refreshList();
    close();
  }

  async function updateRetention(id: string, input: RetentionInput, uploadSessionIds: string[], close: () => void) {
    await apiJson<{ item: RetentionDetail }>(`/api/retenciones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, uploadSessionIds }),
    });
    refreshList();
    close();
  }

  function updateRecordFromDetail(item: RetentionDetail) {
    setRetentions((current) =>
      current.map((record) =>
        record.id === item.id
          ? {
              ...record,
              attachmentCount: item.attachments.length,
              historyCount: item.histories.length,
              status: item.status,
            }
          : record,
      ),
    );
  }

  return (
    <>
      <PageHeader
        title="Retenciones / actas"
        breadcrumbs={[{ label: "Anuncios importantes", href: "/" }, { label: "Retenciones / actas" }]}
      />

      <ListToolbar
        actions={
          <AppModal title="Nueva retencion" trigger={<><Plus className="h-4 w-4" />Nueva retencion</>} size="xl">
            {({ close }) => (
              <RetentionForm submitLabel="Crear retencion" onCancel={close} onSave={(input, files) => addRetention(input, files, close)} />
            )}
          </AppModal>
        }
      >
        <div key={filterRenderKey}>
          <FilterBar resetHref="/retenciones" label="Buscar retencion" onSubmit={applyFilters} onClear={clearFilters} modal>
            <FilterInput label="Desde" name="from" type="date" defaultValue={filters.from} />
            <FilterInput label="Hasta" name="to" type="date" defaultValue={filters.to} />
            <FilterInput label="Nro de acta" name="actNumber" defaultValue={filters.actNumber} />
            <FilterSelect label="Tipo de acta" name="actType" defaultValue={filters.actType} options={ACT_TYPES.map(([value, label]) => [value, label])} />
            <FilterInput label="Legajo" name="recordNumber" defaultValue={filters.recordNumber} />
            <FilterInput label="Dominio" name="domain" defaultValue={filters.domain} />
            <FilterInput label="Nro de motor" name="engineNumber" defaultValue={filters.engineNumber} />
            <FilterInput label="Nro de chasis" name="chassisNumber" defaultValue={filters.chassisNumber} />
            <FilterSelect label="Vehiculo" name="vehicleType" defaultValue={filters.vehicleType} options={VEHICLE_TYPES.map(([value, label]) => [value, label])} />
            <FilterSelect label="Marca" name="brand" defaultValue={filters.brand} options={[...BRANDS]} />
            <FilterSelect label="Color" name="color" defaultValue={filters.color} options={[...COLORS]} />
            <FilterSelect label="Estado" name="status" defaultValue={filters.status} options={RETENTION_STATUSES.map(([value, label]) => [value, label])} />
          </FilterBar>
        </div>
      </ListToolbar>

      <p className="mb-2 text-sm font-medium text-[#495057]">Fecha de inicio: 22 de Julio de 2026</p>

      {error ? <div className="mb-3 rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}

      <Table
        title={hasActiveFilters ? "Retenciones filtradas" : "Retenciones"}
        itemLabel="retenciones"
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => {
          setLoading(true);
          setPage(nextPage);
        }}
        onRefresh={resetAndRefresh}
        headers={["Fecha y hora", "Tipo de acta / Nro", "Identificador", "Vehiculo / Marca / Color", "Estado", "Acciones"]}
        empty={!loading && !retentions.length}
        minWidth={1180}
      >
        {retentions.map((record) => (
          <tr key={record.id}>
            <Td>
              <div className="font-medium">{formatDateTime(record.dateTime)}</div>
              <div className="mt-1 text-xs text-[#212529]">Registro {record.internalNumber}</div>
            </Td>
            <Td>
              <div className="font-medium">{optionLabel(ACT_TYPES, record.actType)}</div>
              <div className="mt-1 text-xs text-[#212529]">Nro: {record.actNumber} - Legajo: {record.recordNumber}</div>
            </Td>
            <Td>
              <IdentifierLine label="Dominio" value={record.domain} />
              <IdentifierLine label="Motor" value={record.engineNumber} />
              <IdentifierLine label="Chasis" value={record.chassisNumber} />
            </Td>
            <Td>
              <div className="font-medium">{optionLabel(VEHICLE_TYPES, record.vehicleType)}</div>
              <div className="mt-1 text-xs text-[#212529]">{record.brand} - {record.color || "Sin color"}</div>
            </Td>
            <Td>
              <StatusBadge value={record.status} />
              <div className="mt-1 text-xs text-[#212529]">Cargado por: {record.createdBy}</div>
              <div className="mt-1 text-xs text-[#212529]">
                {record.attachmentCount} archivos - {record.historyCount} cambios
              </div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <AppModal title={`Detalle ${record.internalNumber}`} trigger={<><Eye className="h-4 w-4" />Ver</>} triggerVariant="secondary" size="lg">
                  <RetentionDetailsPanel record={record} />
                </AppModal>
                <AppModal title={`Editar ${record.internalNumber}`} trigger={<><Edit3 className="h-4 w-4" />Editar</>} triggerVariant="secondary" size="xl">
                  {({ close }) => (
                    <RetentionForm
                      initial={record}
                      submitLabel="Guardar cambios"
                      onCancel={close}
                      onAttachmentChange={updateRecordFromDetail}
                      onSave={(input, files) => updateRetention(record.id, input, files, close)}
                    />
                  )}
                </AppModal>
              </div>
            </Td>
          </tr>
        ))}
      </Table>

      {loading ? <p className="mt-3 text-sm font-medium text-[#212529]">Cargando retenciones...</p> : null}

    </>
  );
}

function IdentifierLine({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("text-xs leading-5", value ? "text-[#212529]" : "text-[#212529]")}>
      <span className="font-semibold">{label}:</span> {value || "N/A"}
    </div>
  );
}
