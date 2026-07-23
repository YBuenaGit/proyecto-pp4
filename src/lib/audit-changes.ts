type JsonRecord = Record<string, unknown>;

export type AuditChangeLog = {
  id: string;
  action: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: Date | string;
  createdBy: { name: string } | null;
};

export type AuditFieldDescriptor = {
  key: string;
  label: string;
  format?: (value: unknown) => string;
  read?: (record: JsonRecord) => unknown;
};

export type AuditChangeRow = {
  id: string;
  auditLogId: string;
  fieldKey: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  modifiedBy: string;
  modifiedAt: Date | string;
};

type AuditChangeProjectionOptions = {
  actions?: readonly string[];
  selectRecord?: (value: unknown) => JsonRecord | null;
  emptyValue?: string;
};

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function comparableValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.trim();
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function displayValue(
  value: unknown,
  descriptor: AuditFieldDescriptor,
  emptyValue: string,
) {
  const formatted = descriptor.format
    ? descriptor.format(value).trim()
    : comparableValue(value);
  return formatted || emptyValue;
}

export function projectAuditChanges(
  logs: readonly AuditChangeLog[],
  descriptors: readonly AuditFieldDescriptor[],
  options: AuditChangeProjectionOptions = {},
): AuditChangeRow[] {
  const actions = new Set(options.actions ?? ["UPDATE", "STATUS_CHANGE"]);
  const selectRecord = options.selectRecord ?? asRecord;
  const emptyValue = options.emptyValue ?? "Sin cargar";

  return logs.flatMap((log) => {
    if (!actions.has(log.action)) return [];

    const before = selectRecord(safeJson(log.beforeJson));
    const after = selectRecord(safeJson(log.afterJson));
    if (!before || !after) return [];

    return descriptors.flatMap((descriptor) => {
      const beforeValue = descriptor.read
        ? descriptor.read(before)
        : before[descriptor.key];
      const afterValue = descriptor.read
        ? descriptor.read(after)
        : after[descriptor.key];
      if (comparableValue(beforeValue) === comparableValue(afterValue)) {
        return [];
      }

      return [{
        id: `${log.id}:${descriptor.key}`,
        auditLogId: log.id,
        fieldKey: descriptor.key,
        fieldLabel: descriptor.label,
        oldValue: displayValue(beforeValue, descriptor, emptyValue),
        newValue: displayValue(afterValue, descriptor, emptyValue),
        modifiedBy: log.createdBy?.name ?? "Sistema",
        modifiedAt: log.createdAt,
      }];
    });
  });
}
