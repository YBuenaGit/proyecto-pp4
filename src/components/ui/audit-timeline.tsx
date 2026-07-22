import { JURIDICAL_CONTEXT_LABELS } from "@/lib/constants";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { personDisplayName } from "@/lib/text";

type JsonRecord = Record<string, unknown>;

export type AuditTimelineLog = {
  id: string;
  action: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: Date;
  createdBy: { name: string; role: string } | null;
};

type AuditDescription = {
  title: string;
  actorLine: string;
  details: string[];
};

const fieldDescriptors = [
  { key: "status", label: "Estado", format: (value: unknown) => labelFromValue(textValue(value)) },
  { key: "urgency", label: "Urgencia", format: (value: unknown) => labelFromValue(textValue(value)) },
  { key: "priority", label: "Prioridad", format: (value: unknown) => labelFromValue(textValue(value)) },
  { key: "type", label: "Tipo", format: (value: unknown) => labelFromValue(textValue(value)) },
  { key: "category", label: "Categoria", format: (value: unknown) => labelFromValue(textValue(value)) },
  {
    key: "interventionContext",
    label: "Contexto",
    format: (value: unknown) => {
      const text = textValue(value);
      return text ? (JURIDICAL_CONTEXT_LABELS[text] ?? labelFromValue(text)) : "";
    },
  },
  { key: "oficioNumber", label: "Numero de oficio" },
  { key: "expedienteNumber", label: "Numero de expediente" },
  { key: "codigo", label: "Código" },
  { key: "area", label: "Area" },
  { key: "derivedArea", label: "Area derivada" },
  { key: "attendedAt", label: "Fecha de atencion", format: formatAuditDateTime },
  { key: "deadlineAt", label: "Plazo", format: formatAuditDateTime },
  { key: "description", label: "Descripcion" },
  { key: "observation", label: "Observacion" },
  { key: "guidanceProvided", label: "Orientacion / intervencion realizada" },
  { key: "confidentialNotes", label: "Notas internas confidenciales" },
] satisfies Array<{
  key: string;
  label: string;
  format?: (value: unknown) => string;
}>;

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function interventionRecord(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.intervention) ?? record;
}

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function normalizeComparable(value: unknown) {
  const text = textValue(value);
  return text || "";
}

function formatAuditDateTime(value: unknown) {
  const text = textValue(value);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : formatDateTime(date);
}

function truncate(value: string, maxLength = 90) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 3)}...` : singleLine;
}

function formatAuditValue(value: unknown, formatter?: (value: unknown) => string) {
  const formatted = formatter ? formatter(value) : textValue(value);
  return formatted ? truncate(formatted) : "sin cargar";
}

function changedFieldPhrase(before: JsonRecord, after: JsonRecord, key: string, label: string, formatter?: (value: unknown) => string) {
  const beforeValue = before[key];
  const afterValue = after[key];
  if (normalizeComparable(beforeValue) === normalizeComparable(afterValue)) return null;
  return `Cambio ${label} de ${formatAuditValue(beforeValue, formatter)} a ${formatAuditValue(afterValue, formatter)}.`;
}

function personName(person: JsonRecord, lastNameKey: "lastName" | "apellidoApodoManual") {
  return personDisplayName(textValue(person[lastNameKey]), textValue(person.firstName));
}

function personSummary(person: JsonRecord, lastNameKey: "lastName" | "apellidoApodoManual") {
  if (person.isAnonymous === true) return "Denunciante anonimo";
  const name = personName(person, lastNameKey);
  const dni = textValue(person.dni);
  if (name && dni) return `${name} (${dni})`;
  return name || dni || "sin datos";
}

function collectionSummary(value: unknown, lastNameKey: "lastName" | "apellidoApodoManual") {
  if (!Array.isArray(value) || !value.length) return "sin cargar";
  return value
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) => personSummary(item, lastNameKey))
    .join("; ");
}

function legacyComplainantSummary(record: JsonRecord | null) {
  if (!record) return "sin cargar";
  if (Array.isArray(record.complainants)) return collectionSummary(record.complainants, "lastName");
  if (record.complainantIsAnonymous === true) return "Denunciante anonimo";
  const name = personDisplayName(textValue(record.complainantLastName), textValue(record.complainantFirstName));
  const dni = textValue(record.complainantDni);
  if (name && dni) return `${name} (${dni})`;
  return name || dni || "sin cargar";
}

function legacyLinkedSummary(record: JsonRecord | null) {
  if (!record) return "sin cargar";
  if (Array.isArray(record.linkedPersons)) return collectionSummary(record.linkedPersons, "apellidoApodoManual");
  const name = [textValue(record.personFirstName), textValue(record.nameSnapshot)].filter(Boolean).join(" ");
  const dni = textValue(record.dniSnapshot);
  if (name && dni) return `${name} (${dni})`;
  return name || dni || "sin cargar";
}

function collectionChangePhrase(before: JsonRecord | null, after: JsonRecord | null, label: string, summary: (record: JsonRecord | null) => string) {
  const beforeSummary = summary(before);
  const afterSummary = summary(after);
  if (beforeSummary === afterSummary) return null;
  return `Modifico ${label} de ${truncate(beforeSummary)} a ${truncate(afterSummary)}.`;
}

function afterActionRecord(afterJson: unknown) {
  return asRecord(asRecord(afterJson)?.action);
}

function afterObservationRecord(afterJson: unknown) {
  return asRecord(asRecord(afterJson)?.observation);
}

export function auditLogActionId(log: AuditTimelineLog) {
  const action = afterActionRecord(safeJson(log.afterJson));
  return textValue(action?.id) || null;
}

function attachmentDetails(afterJson: unknown) {
  const attachments = Array.isArray(afterJson) ? afterJson : [];
  const names = attachments
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) => textValue(item.originalName) || textValue(item.fileName))
    .filter(Boolean);

  if (!names.length) return ["Adjunto archivos privados."];
  if (names.length === 1) return [`Adjunto ${names[0]}.`];
  return [`Adjunto ${names.length} archivos: ${truncate(names.join(", "))}.`];
}

function auditDetails(log: AuditTimelineLog, beforeRecord: JsonRecord | null, afterRecord: JsonRecord | null, afterJson: unknown) {
  if (log.action === "CREATE") {
    return [
      afterRecord?.status ? `Estado inicial: ${labelFromValue(textValue(afterRecord.status))}.` : null,
      afterRecord?.type ? `Tipo inicial: ${labelFromValue(textValue(afterRecord.type))}.` : null,
      afterRecord?.urgency ? `Urgencia inicial: ${labelFromValue(textValue(afterRecord.urgency))}.` : null,
    ].filter((item): item is string => Boolean(item));
  }

  if (log.action === "ATTACHMENT") return attachmentDetails(afterJson);

  if (log.action === "OBSERVATION") {
    const observation = afterObservationRecord(afterJson);
    const content = textValue(observation?.content);
    return content
      ? [`Observacion: ${truncate(content, 180)}`]
      : ["Agrego una observacion al legajo."];
  }

  const action = afterActionRecord(afterJson);
  if (action) {
    const details = [
      action.actionType ? `Tipo: ${labelFromValue(textValue(action.actionType))}.` : null,
      action.content ? truncate(textValue(action.content), 140) : null,
    ].filter((item): item is string => Boolean(item));
    if (beforeRecord && afterRecord) {
      const statusChange = changedFieldPhrase(beforeRecord, afterRecord, "status", "Estado", (value) => labelFromValue(textValue(value)));
      if (statusChange) details.push(statusChange);
    }
    return details;
  }

  if (!beforeRecord || !afterRecord) return ["Registro actualizado."];

  const details = fieldDescriptors
    .map((field) => changedFieldPhrase(beforeRecord, afterRecord, field.key, field.label, field.format))
    .filter((item): item is string => Boolean(item));

  const complainants = collectionChangePhrase(beforeRecord, afterRecord, "personas denunciantes", legacyComplainantSummary);
  const linkedPersons = collectionChangePhrase(beforeRecord, afterRecord, "personas denunciadas / vinculadas", legacyLinkedSummary);
  if (complainants) details.push(complainants);
  if (linkedPersons) details.push(linkedPersons);

  return details.length ? details : ["Registro actualizado."];
}

function auditTitle(log: AuditTimelineLog, actor: string, afterJson: unknown) {
  const action = afterActionRecord(afterJson);
  if (log.action === "CREATE") return `${actor} creo la intervencion`;
  if (log.action === "UPDATE") return `${actor} edito la intervencion`;
  if (log.action === "STATUS_CHANGE" && action) return `${actor} registro una hoja y cambio el estado`;
  if (log.action === "STATUS_CHANGE") return `${actor} cambio el estado`;
  if (log.action === "ACTION") return `${actor} agrego una hoja al legajo`;
  if (log.action === "ACTION_UPDATE") return `${actor} edito una hoja del legajo`;
  if (log.action === "ATTACHMENT") return `${actor} adjunto archivos`;
  if (log.action === "REFERRAL") return `${actor} registro una derivacion`;
  if (log.action === "OBSERVATION") return `${actor} agrego una observacion`;
  return `${actor} registro ${labelFromValue(log.action)}`;
}

export function describeAuditLog(log: AuditTimelineLog): AuditDescription {
  const actor = log.createdBy?.name ?? "Sistema";
  const role = log.createdBy ? labelFromValue(log.createdBy.role) : "Sistema";
  const beforeJson = safeJson(log.beforeJson);
  const afterJson = safeJson(log.afterJson);
  const beforeRecord = interventionRecord(beforeJson);
  const afterRecord = interventionRecord(afterJson);

  return {
    title: auditTitle(log, actor, afterJson),
    actorLine: `${actor} (${role})`,
    details: auditDetails(log, beforeRecord, afterRecord, afterJson),
  };
}

export function AuditTimeline({ logs }: { logs: AuditTimelineLog[] }) {
  if (!logs.length) return <p className="text-sm text-[#212529]">Sin eventos de auditoria registrados.</p>;

  return (
    <ol className="space-y-4">
      {logs.map((log) => {
        const description = describeAuditLog(log);

        return (
          <li key={log.id} className="border-l-2 border-sky-200 pl-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[#212529]">{description.title}</span>
              <span className="text-xs text-[#212529]">{formatDateTime(log.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-[#212529]">{description.actorLine}</p>
            {description.details.length ? (
              <ul className="mt-2 space-y-1 text-sm leading-6 text-[#495057]">
                {description.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
