import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Download, Edit, FileText, Plus, Send } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { Button, LinkButton } from "@/components/ui/button";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { FormField, inputClass, textareaClass } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { JURIDICAL_CONTEXT_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, labelFromValue } from "@/lib/format";
import { chunkForBookPages, paginateBookTextSections } from "@/lib/book-pagination";
import { parseJuridicalActionContent } from "@/lib/juridical-action-content";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";
import {
  addJuridicalAction,
  deriveJuridicalToDispatch,
  updateJuridicalAction,
  updateJuridicalIntervention,
} from "../actions";
import { InterventionForm } from "../intervention-form";
import { AddJuridicalActionForm } from "./add-juridical-action-form";
import { LegajoInterventionRow } from "./legajo-intervention-row";
import { AttachmentPreviewButton } from "./attachment-preview-button";
import { LegajoBookViewer, type LegajoBookItem } from "./legajo-book-viewer";
import { LegajoActionEditButton } from "./legajo-action-edit-button";
import { BookSectionCover, BookContentSheet } from "./legajo-book-sheets";

type JsonRecord = Record<string, unknown>;

type PersonItem = {
  isAnonymous?: boolean | null;
  dni?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  apellidoApodoManual?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
};

type LegajoAttachment = {
  id: string;
  entityType: string;
  entityId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedBy: { name: string };
  isPrivate: boolean;
};

function display(value: string | null | undefined) {
  return value?.trim() || "-";
}

function fullName(person: PersonItem) {
  return [person.firstName, person.lastName ?? person.apellidoApodoManual].filter(Boolean).join(" ").trim();
}

function phoneLine(person: PersonItem) {
  return [person.phone1, person.phone2].filter(Boolean).join(" / ");
}

function contextLabel(value: string | null | undefined) {
  return value ? JURIDICAL_CONTEXT_LABELS[value] ?? labelFromValue(value) : "-";
}

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

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function interventionFromAudit(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.intervention) ?? record;
}

function statusChangeByActionId(logs: Array<{ beforeJson: string | null; afterJson: string | null }>) {
  const changes = new Map<string, { before: string; after: string }>();
  logs.forEach((log) => {
    const afterJson = safeJson(log.afterJson);
    const action = asRecord(asRecord(afterJson)?.action);
    const actionId = textValue(action?.id);
    if (!actionId) return;

    const beforeStatus = textValue(interventionFromAudit(safeJson(log.beforeJson))?.status);
    const afterStatus = textValue(interventionFromAudit(afterJson)?.status);
    if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
      changes.set(actionId, { before: beforeStatus, after: afterStatus });
    }
  });
  return changes;
}

function initialStatusFromAudit(logs: Array<{ action: string; afterJson: string | null }>, fallback: string) {
  const createLog = logs.find((log) => log.action === "CREATE");
  const createdStatus = textValue(interventionFromAudit(safeJson(createLog?.afterJson ?? null))?.status);
  return createdStatus || fallback;
}

function PersonBlock({
  title,
  people,
  profileHref,
}: {
  title: string;
  people: PersonItem[];
  profileHref?: string | null;
}) {
  return (
    <div className="rounded-xl bg-[#f6fafc] p-3 ring-1 ring-[#d7e4ee]">
      <h3 className="text-sm font-semibold text-[#212529]">{title}</h3>
      <div className="mt-3 space-y-3">
        {people.length ? (
          people.map((person, index) => (
            <div key={`${title}-${index}`} className="rounded-lg bg-white px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ring-[#e4edf4]">
              {person.isAnonymous ? (
                <p className="font-semibold text-[#212529]">Denunciante anonimo</p>
              ) : (
                <>
                  <p className="font-semibold text-[#212529]">{display(fullName(person))}</p>
                  <p className="text-[#607589]">DNI: {display(person.dni)}</p>
                  <p className="text-[#607589]">Telefono: {display(phoneLine(person))}</p>
                  <p className="text-[#607589]">Domicilio: {display(person.address)}</p>
                  {index === 0 && profileHref ? (
                    <Link className="mt-1 inline-block font-semibold text-[#0667b0] hover:underline" href={profileHref}>
                      Ver persona
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-[#607589]">Sin datos cargados.</p>
        )}
      </div>
    </div>
  );
}

function SheetText({ label, children }: { label: string; children: string | null | undefined }) {
  if (!children?.trim()) return null;
  return (
    <div className="rounded-sm border border-[#b7dfee] bg-[#f6fcff] px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">{label}</p>
      <p className="book-leaf-text mt-1 whitespace-pre-wrap text-[15px] leading-7 text-[#212529]">{children}</p>
    </div>
  );
}

function SheetAttachments({ attachments }: { attachments: LegajoAttachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Adjuntos de esta intervencion</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex min-w-0 items-start gap-2 rounded-sm border border-[#dee2e6] bg-white px-3 py-2 text-sm text-[#212529] transition hover:bg-[#e9ecef]"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#0667b0]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{attachment.originalName}</span>
              <span className="block text-xs text-[#6c757d]">{Math.ceil(attachment.size / 1024)} KB Â· {attachment.uploadedBy.name}</span>
              <span className="mt-2 block">
                <AttachmentPreviewButton href={`/adjuntos/${attachment.id}`} name={attachment.originalName} mimeType={attachment.mimeType} compact />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-[#b7dfee] py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0c5460]">{label}</p>
      <div className="mt-0.5 text-sm font-semibold leading-6 text-[#212529]">{value || "-"}</div>
    </div>
  );
}

function LegajoCoverSheet({
  internalNumber,
  type,
  context,
  status,
  urgency,
  attendedAt,
  createdBy,
  oficioNumber,
  expedienteNumber,
  personName,
  personDni,
  attachments,
}: {
  internalNumber: string;
  type: string;
  context: string;
  status: string;
  urgency: string;
  attendedAt: Date;
  createdBy: string;
  oficioNumber?: string | null;
  expedienteNumber?: string | null;
  personName: string;
  personDni?: string | null;
  attachments: LegajoAttachment[];
}) {
  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-[#eefaff] shadow-[0_16px_38px_rgba(0,0,0,0.30)]">
      <div className="border-b border-[#b7dfee] bg-[#dff3fb] px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-28 items-center justify-center rounded-sm border border-[#b7dfee] bg-white px-2 py-1">
              <Image src="/logo-gum1.webp" alt="Secretaria de Seguridad" width={180} height={80} className="max-h-full w-auto object-contain" priority />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">Caratula</p>
              <h3 className="mt-2 text-xl font-semibold uppercase tracking-wide text-[#212529]">Legajo de intervencion</h3>
              <p className="mt-1 text-sm font-semibold text-[#0c5460]">Secretaria de Seguridad Municipal</p>
            </div>
          </div>
          <div className="rounded-sm border border-[#86cfdf] bg-white px-3 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0c5460]">NÂ° de legajo</p>
            <p className="mt-1 text-base font-semibold text-[#212529]">{internalNumber}</p>
          </div>
        </div>
      </div>

      <div className="book-leaf-body space-y-5 px-5 py-5">
        <div className="rounded-sm border border-[#b7dfee] bg-white/80 px-4 py-3">
          <CoverField label="Tipo / contexto" value={`${type} Â· ${context}`} />
          <CoverField label="Fecha de apertura" value={formatDateTime(attendedAt)} />
          <CoverField label="Usuario que inicio" value={createdBy} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CoverField label="Estado" value={<StatusBadge value={status} className="w-auto max-w-none" />} />
          <CoverField label="Urgencia" value={<StatusBadge value={urgency} className="w-auto max-w-none" />} />
          <CoverField label="Persona vinculada" value={personName} />
          <CoverField label="DNI" value={personDni} />
          <CoverField label="Oficio" value={oficioNumber} />
          <CoverField label="Expediente / legajo" value={expedienteNumber} />
          <CoverField label="Archivos generales" value={attachments.length === 1 ? "1 archivo vinculado" : `${attachments.length} archivos vinculados`} />
        </div>
      </div>
    </article>
  );
}

function LegajoAttachmentSheet({ attachments, pageNumber, pageCount }: { attachments: LegajoAttachment[]; pageNumber?: number; pageCount?: number }) {
  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-[#eefaff] shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
      <div className="border-b border-[#b7dfee] bg-[#dff3fb] px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">Archivos</p>
        <h3 className="mt-1 text-lg font-semibold text-[#212529]">Archivos generales del legajo{pageCount && pageCount > 1 ? ` · hoja ${pageNumber} de ${pageCount}` : ""}</h3>
        <p className="mt-1 text-sm text-[#6c757d]">Documentacion adjunta disponible para abrir o descargar.</p>
      </div>
      <div className="book-leaf-body grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="rounded-sm border border-[#dee2e6] bg-white px-3 py-3 shadow-sm">
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="mt-1 h-4 w-4 shrink-0 text-[#0667b0]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#212529]">{attachment.originalName}</p>
                <p className="text-xs text-[#6c757d]">{Math.ceil(attachment.size / 1024)} KB Â· {attachment.uploadedBy.name}</p>
                <div className="mt-3">
                  <AttachmentPreviewButton href={`/adjuntos/${attachment.id}`} name={attachment.originalName} mimeType={attachment.mimeType} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function InterventionReadContent({
  date,
  actor,
  role,
  actionType,
  statusText,
  description,
  guidance,
  nextStepDescription,
  nextStepDate,
  confidentialNotes,
  attachments,
}: {
  date: Date;
  actor: string;
  role: string;
  actionType?: string | null;
  statusText?: string | null;
  description: string;
  guidance?: string | null;
  nextStepDescription?: string | null;
  nextStepDate?: Date | null;
  confidentialNotes?: string | null;
  attachments: LegajoAttachment[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-sm border border-[#b7dfee] bg-[#eefaff] p-3 sm:grid-cols-2">
        <CoverField label="Fecha y hora" value={formatDateTime(date)} />
        <CoverField label="Quien cargo" value={`${actor} (${labelFromValue(role)})`} />
        <CoverField label="Tipo de actuacion" value={actionType ? labelFromValue(actionType) : "-"} />
        <CoverField label="Estado / seguimiento" value={statusText ?? (nextStepDate ? `Seguimiento: ${formatDate(nextStepDate)}` : "-")} />
      </div>

      <SheetText label="Descripcion del relato">{description}</SheetText>
      <SheetText label="Lo que se instruyo">{guidance}</SheetText>
      <SheetText label="Proxima accion">{nextStepDescription}</SheetText>
      <SheetText label="Notas internas confidenciales">{confidentialNotes}</SheetText>

      {attachments.length ? (
        <div className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Archivos vinculados</p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <AttachmentPreviewButton key={attachment.id} href={`/adjuntos/${attachment.id}`} name={attachment.originalName} mimeType={attachment.mimeType} compact />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const ORDINAL_WORDS = ["", "Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta", "Septima", "Octava", "Novena", "Decima", "Undecima", "Duodecima"];

function attentionLabel(position: number) {
  const word = ORDINAL_WORDS[position];
  return word ? `${word} atencion` : `Atencion ${position}`;
}

export default async function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const { id } = await params;
  const [intervention, areas, types, contexts] = await Promise.all([
    prisma.juridicalIntervention.findUnique({
      where: { id },
      include: {
        person: true,
        complainants: { orderBy: { sortOrder: "asc" } },
        linkedPersons: { orderBy: { sortOrder: "asc" } },
        createdBy: true,
        actions: { include: { createdBy: true }, orderBy: { createdAt: "asc" } },
        destinationReferrals: {
          include: { originDispatchRecord: true, referredBy: true },
          orderBy: { referredAt: "desc" },
        },
        originReferrals: {
          include: { destinationDispatchRecord: true, referredBy: true },
          orderBy: { referredAt: "desc" },
        },
      },
    }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "intervention_context", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!intervention) notFound();

  const actionIds = intervention.actions.map((action) => action.id);
  const [attachments, auditLogs] = await Promise.all([
    prisma.attachment.findMany({
      where: {
        module: "JURIDICO",
        OR: [
          { entityType: "JuridicalIntervention", entityId: intervention.id },
          ...(actionIds.length ? [{ entityType: "JuridicalAction", entityId: { in: actionIds } }] : []),
        ],
      },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "JuridicalIntervention", entityId: id },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const generalAttachments = attachments.filter((attachment) => attachment.entityType === "JuridicalIntervention");
  const attachmentsByActionId = new Map<string, LegajoAttachment[]>();
  attachments
    .filter((attachment) => attachment.entityType === "JuridicalAction")
    .forEach((attachment) => {
      const current = attachmentsByActionId.get(attachment.entityId) ?? [];
      current.push(attachment);
      attachmentsByActionId.set(attachment.entityId, current);
    });

  const complainants = intervention.complainants.length
    ? intervention.complainants
    : intervention.complainantIsAnonymous ||
        intervention.complainantDni ||
        intervention.complainantFirstName ||
        intervention.complainantLastName ||
        intervention.complainantPhone1 ||
        intervention.complainantPhone2 ||
        intervention.complainantAddress
      ? [
          {
            isAnonymous: intervention.complainantIsAnonymous,
            dni: intervention.complainantDni,
            firstName: intervention.complainantFirstName,
            lastName: intervention.complainantLastName,
            phone1: intervention.complainantPhone1,
            phone2: intervention.complainantPhone2,
            address: intervention.complainantAddress,
          },
        ]
      : [];
  const linkedPersons = intervention.linkedPersons.length
    ? intervention.linkedPersons
    : intervention.person || intervention.dniSnapshot || intervention.nameSnapshot
      ? [
          {
            dni: intervention.person?.dni ?? intervention.dniSnapshot,
            firstName: intervention.person?.firstName ?? null,
            apellidoApodoManual: intervention.person?.lastName ?? intervention.nameSnapshot,
            phone1: intervention.person?.phone1 ?? null,
            phone2: intervention.person?.phone2 ?? null,
            address: intervention.person?.address ?? null,
          },
        ]
      : [];
  const primaryLinkedPerson = linkedPersons[0] ?? null;
  const primaryLinkedName = primaryLinkedPerson ? display(fullName(primaryLinkedPerson)) : "-";

  const statusChanges = statusChangeByActionId(auditLogs);
  const visibleActions = intervention.actions.filter((action) => !(action.actionType === "DERIVACION" && action.content.startsWith("Derivacion a Despacho:")));
  const actionSheets = visibleActions.map((action, actionIndex) => {
    const parsed = parseJuridicalActionContent(action.content);
    const statusChange = statusChanges.get(action.id);
    return {
      action,
      sheetNumber: actionIndex + 2,
      parsed,
      statusText: statusChange ? `Estado: ${labelFromValue(statusChange.before)} -> ${labelFromValue(statusChange.after)}` : null,
    };
  });
  const displayActionSheets = [...actionSheets].sort((a, b) => b.action.createdAt.getTime() - a.action.createdAt.getTime());
  const initialStatusText = `Estado inicial: ${labelFromValue(initialStatusFromAudit(auditLogs, intervention.status))}`;
  const bookEntries: Array<{ item: LegajoBookItem; node: ReactNode }> = [
    {
      item: {
        sheetNumber: 0,
        label: "Caratula",
        title: "Datos principales",
        dateText: formatDateTime(intervention.attendedAt),
        statusText: labelFromValue(intervention.status),
        searchText: [
          intervention.internalNumber,
          labelFromValue(intervention.type),
          contextLabel(intervention.interventionContext),
          intervention.oficioNumber,
          intervention.expedienteNumber,
          primaryLinkedName,
          primaryLinkedPerson?.dni,
          intervention.description,
        ].filter(Boolean).join(" "),
      },
      node: (
        <LegajoCoverSheet
          key="cover"
          internalNumber={intervention.internalNumber}
          type={labelFromValue(intervention.type)}
          context={contextLabel(intervention.interventionContext)}
          status={intervention.status}
          urgency={intervention.urgency}
          attendedAt={intervention.attendedAt}
          createdBy={intervention.createdBy.name}
          oficioNumber={intervention.oficioNumber}
          expedienteNumber={intervention.expedienteNumber}
          personName={primaryLinkedName}
          personDni={primaryLinkedPerson?.dni}
          attachments={generalAttachments}
        />
      ),
    },
  ];

  const interventionEyebrow = `Legajo ${intervention.internalNumber}`;
  const firstAttentionType = labelFromValue(intervention.type);

  bookEntries.push({
    item: {
      sheetNumber: 1,
      label: "Primera atencion",
      title: firstAttentionType,
      dateText: formatDateTime(intervention.attendedAt),
      statusText: initialStatusText,
      searchText: [firstAttentionType, intervention.createdBy.name].filter(Boolean).join(" "),
    },
    node: (
      <BookSectionCover
        key="cover-primera-atencion"
        eyebrow={interventionEyebrow}
        ordinal="Primera atencion"
        subtitle={firstAttentionType}
        meta={[
          { label: "Fecha", value: formatDateTime(intervention.attendedAt) },
          { label: "Registrado por", value: `${intervention.createdBy.name} (${labelFromValue(intervention.createdBy.role)})` },
          { label: "Estado inicial", value: labelFromValue(initialStatusFromAudit(auditLogs, intervention.status)) },
          { label: "Contexto", value: contextLabel(intervention.interventionContext) },
        ]}
      />
    ),
  });

  const firstAttentionPages = paginateBookTextSections(
    [
      { label: "Descripcion del relato", text: intervention.description },
      { label: "Lo que se instruyo", text: intervention.guidanceProvided },
      { label: "Notas internas confidenciales", text: intervention.confidentialNotes },
    ],
    { firstPageLines: 24, continuationPageLines: 28 },
  );

  firstAttentionPages.forEach((textPage, pageIndex) => {
    bookEntries.push({
      item: {
        sheetNumber: 1,
        label: pageIndex > 0 ? `Primera atencion · cont. ${pageIndex + 1}` : "Primera atencion · contenido",
        title: firstAttentionType,
        dateText: formatDateTime(intervention.attendedAt),
        statusText: initialStatusText,
        searchText: [intervention.description, intervention.guidanceProvided, intervention.confidentialNotes].filter(Boolean).join(" "),
      },
      node: (
        <BookContentSheet
          key={`first-attention-${pageIndex}`}
          sectionLabel="Primera atencion"
          textBlocks={textPage.blocks}
          pageNumber={pageIndex + 1}
          pageCount={firstAttentionPages.length}
        />
      ),
    });
  });

  actionSheets.forEach(({ action, sheetNumber, parsed, statusText }) => {
    const textPages = paginateBookTextSections(
      [
        { label: "Descripcion del relato", text: parsed.description },
        { label: "Lo que se instruyo", text: parsed.guidanceProvided },
        { label: "Proxima accion", text: parsed.nextStepDescription },
      ],
      { firstPageLines: 24, continuationPageLines: 28 },
    );
    const rowAttachments = attachmentsByActionId.get(action.id) ?? [];
    const actionTitle = labelFromValue(action.actionType);
    const sectionLabel = attentionLabel(sheetNumber);

    bookEntries.push({
      item: {
        sheetNumber,
        label: sectionLabel,
        title: actionTitle,
        dateText: formatDateTime(action.createdAt),
        statusText,
        searchText: [actionTitle, action.createdBy.name].filter(Boolean).join(" "),
      },
      node: (
        <BookSectionCover
          key={`cover-${action.id}`}
          eyebrow={interventionEyebrow}
          ordinal={sectionLabel}
          subtitle={actionTitle}
          meta={[
            { label: "Fecha", value: formatDateTime(action.createdAt) },
            { label: "Registrado por", value: `${action.createdBy.name} (${labelFromValue(action.createdBy.role)})` },
            ...(statusText ? [{ label: "Estado", value: statusText }] : []),
            ...(action.nextStepDate ? [{ label: "Seguimiento", value: formatDate(action.nextStepDate) }] : []),
          ]}
        />
      ),
    });

    textPages.forEach((textPage, pageIndex) => {
      bookEntries.push({
        item: {
          sheetNumber,
          label: pageIndex > 0 ? `${sectionLabel} · cont. ${pageIndex + 1}` : `${sectionLabel} · contenido`,
          title: actionTitle,
          dateText: formatDateTime(action.createdAt),
          statusText,
          searchText: [parsed.description, parsed.guidanceProvided, parsed.nextStepDescription].filter(Boolean).join(" "),
        },
        node: (
          <BookContentSheet
            key={`action-${action.id}-${pageIndex}`}
            sectionLabel={sectionLabel}
            textBlocks={textPage.blocks}
            pageNumber={pageIndex + 1}
            pageCount={textPages.length}
            footer={pageIndex === textPages.length - 1 ? <SheetAttachments attachments={rowAttachments} /> : undefined}
          />
        ),
      });
    });
  });

  if (generalAttachments.length) {
    const attachmentPages = chunkForBookPages(generalAttachments, 8);

    attachmentPages.forEach((attachmentPage, pageIndex) => {
      bookEntries.push({
        item: {
          sheetNumber: displayActionSheets.length + 2,
          label: attachmentPages.length > 1 ? `Archivos · hoja ${pageIndex + 1}` : "Archivos",
          title: "Archivos del legajo",
          dateText: formatDateTime(generalAttachments[0]?.createdAt ?? intervention.createdAt),
          statusText: `${generalAttachments.length} archivo${generalAttachments.length === 1 ? "" : "s"}`,
          searchText: generalAttachments.map((attachment) => attachment.originalName).join(" "),
        },
        node: (
          <LegajoAttachmentSheet
            key={`attachments-${pageIndex}`}
            attachments={attachmentPage}
            pageNumber={pageIndex + 1}
            pageCount={attachmentPages.length}
          />
        ),
      });
    });
  }

  const bookItems = bookEntries.map((entry) => entry.item);

  return (
    <main className="space-y-5">
      <section
        className="relative overflow-hidden rounded-sm border border-[#b7dfee] bg-[#a1bbcf] p-3 text-[#212529] shadow-sm sm:p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">Expediente virtual Â· Legajo de intervencion</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#212529] sm:text-3xl">Legajo de la intervencion {intervention.internalNumber}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-[#b7dfee] bg-white px-2.5 py-1 text-sm font-semibold text-[#0c5460]">{labelFromValue(intervention.type)}</span>
              <StatusBadge value={intervention.status} className="w-auto max-w-none" />
              <StatusBadge value={intervention.urgency} className="w-auto max-w-none" />
              <span className="rounded-sm border border-[#b7dfee] bg-white px-2.5 py-1 text-sm font-semibold text-[#0c5460]">
                Apertura: {formatDateTime(intervention.attendedAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppModal title={`Editar datos generales ${intervention.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar datos generales</>} triggerVariant="secondary" size="xl">
              <InterventionForm
                action={updateJuridicalIntervention.bind(null, intervention.id)}
                record={intervention}
                types={types.map((item) => ({ value: item.value, label: item.label }))}
                contexts={contexts.map((item) => ({ value: item.value, label: item.label }))}
                backHref={`/intervenciones/${intervention.id}`}
                modal
                submitLabel="Guardar cambios"
              />
            </AppModal>
            <AppModal title="Nuevo registro de intervencion" description="Crea una nueva intervencion documental dentro de este legajo." trigger={<><Plus className="h-4 w-4" />Nueva intervencion</>} size="md">
              <AddJuridicalActionForm action={addJuridicalAction.bind(null, intervention.id)} submitLabel="Crear intervencion" showFollowUp={false} />
            </AppModal>
            <AppModal title="Derivar a Despacho" trigger={<><Send className="h-4 w-4" />Derivar</>} triggerVariant="secondary" size="md">
              <form action={deriveJuridicalToDispatch.bind(null, intervention.id)} className="space-y-4">
                <FormField label="Derivar a Despacho">
                  <textarea name="summary" className={textareaClass} placeholder="Resumen operativo, sin notas sensibles innecesarias" required />
                </FormField>
                <FormField label="Area sugerida">
                  <select name="area" className={inputClass} defaultValue="">
                    <option value="">Despacho</option>
                    {areas.map((item) => (
                      <option key={item.value} value={item.label}>{item.label}</option>
                    ))}
                  </select>
                </FormField>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit">Guardar</Button>
                  <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                </div>
              </form>
            </AppModal>
            <AppModal title="Historial completo de auditoria" trigger={<><FileText className="h-4 w-4" />Auditoria</>} triggerVariant="secondary" size="lg">
              <AuditTimeline logs={auditLogs} />
            </AppModal>
            <LinkButton href={`/intervenciones/${intervention.id}/legajo.pdf`} variant="secondary" target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Descargar legajo PDF
            </LinkButton>
            <LinkButton href="/intervenciones" variant="secondary">Volver</LinkButton>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DetailSection title="Datos generales de la intervencion">
          <FieldGrid>
            <DetailField label="Estado actual" value={<StatusBadge value={intervention.status} />} />
            <DetailField label="Urgencia" value={<StatusBadge value={intervention.urgency} />} />
            <DetailField label="Tipo" value={labelFromValue(intervention.type)} />
            <DetailField label="Contexto" value={contextLabel(intervention.interventionContext)} />
            <DetailField label="Oficio" value={intervention.oficioNumber} />
            <DetailField label="Expediente / legajo" value={intervention.expedienteNumber} />
            <DetailField label="Area derivada" value={intervention.derivedArea} />
            <DetailField label="Fecha inicial" value={formatDateTime(intervention.attendedAt)} />
            <DetailField label="Carga en sistema" value={formatDateTime(intervention.createdAt)} />
            <DetailField label="Usuario que inicio" value={intervention.createdBy.name} />
            <DetailField label="Origen" value={labelFromValue(intervention.origin)} />
            <DetailField label="Ultima actualizacion" value={formatDateTime(intervention.lastStatusAt)} />
          </FieldGrid>
        </DetailSection>

        <DetailSection title="Personas vinculadas">
          <div className="grid gap-3 lg:grid-cols-2">
            <PersonBlock title="Solicitante / denunciante" people={complainants} />
            <PersonBlock title="Persona vinculada / denunciada" people={linkedPersons} profileHref={intervention.personId ? `/personas/${intervention.personId}` : null} />
          </div>
        </DetailSection>
      </section>

      <DetailSection
        title="Intervenciones del legajo"
        action={
          <LegajoBookViewer
            items={bookItems}
            downloadHref={`/intervenciones/${intervention.id}/legajo.pdf`}
          >
            {bookEntries.map((entry) => entry.node)}
          </LegajoBookViewer>
        }
      >
        <Table
          title="Intervenciones del legajo"
          itemLabel="intervenciones"
          total={displayActionSheets.length + 1}
          showPagination={false}
          rowClick={false}
          headers={["Intervencion", "Fecha / usuario", "Actuacion", "Estado / seguimiento", "Archivo"]}
          minWidth={980}
        >
          {displayActionSheets.map(({ action, sheetNumber, parsed, statusText }) => {
            const rowAttachments = attachmentsByActionId.get(action.id) ?? [];
            return (
              <LegajoInterventionRow
                key={action.id}
                modalTitle={`Intervencion NÂ° ${sheetNumber}`}
                modalContent={
                  <InterventionReadContent
                    date={action.createdAt}
                    actor={action.createdBy.name}
                    role={action.createdBy.role}
                    actionType={action.actionType}
                    statusText={statusText}
                    description={parsed.description}
                    guidance={parsed.guidanceProvided}
                    nextStepDescription={parsed.nextStepDescription}
                    nextStepDate={action.nextStepDate}
                    attachments={rowAttachments}
                  />
                }
              >
                <Td className="w-[150px]">
                  <span className="block font-semibold text-[#0667b0]">Intervencion NÂ° {sheetNumber}</span>
                  <span className="mt-0.5 block text-xs text-[#6c757d]">Registro agregado</span>
                </Td>
                <Td className="w-[210px]">
                  <span className="block font-semibold">{formatDateTime(action.createdAt)}</span>
                  <span className="mt-0.5 block text-xs text-[#6c757d]">{action.createdBy.name} Â· {labelFromValue(action.createdBy.role)}</span>
                </Td>
                <Td>
                  <span className="block font-semibold">{labelFromValue(action.actionType)}</span>
                  <span className="mt-1 block text-xs font-medium text-[#0667b0]">Clic para ver el detalle</span>
                  <div className="mt-2">
                    <LegajoActionEditButton title={`Editar intervencion N° ${sheetNumber}`}>
                      <AddJuridicalActionForm
                        action={updateJuridicalAction.bind(null, action.id)}
                        initialValues={{
                          actionType: action.actionType,
                          createdAt: action.createdAt,
                          description: parsed.description,
                          guidanceProvided: parsed.guidanceProvided,
                          nextStepDescription: parsed.nextStepDescription,
                          nextStepDate: action.nextStepDate,
                        }}
                        submitLabel="Guardar intervencion"
                      />
                    </LegajoActionEditButton>
                  </div>
                </Td>
                <Td className="w-[230px]">
                  <div className="flex flex-wrap gap-1.5">
                    {statusText ? <span className="rounded-sm border border-[#c3e6cb] bg-[#d4edda] px-2 py-0.5 text-xs font-semibold text-[#155724]">{statusText}</span> : null}
                    {action.nextStepDate ? (
                      <span className="rounded-sm border border-[#ffeeba] bg-[#fff3cd] px-2 py-0.5 text-xs font-semibold text-[#856404]">
                        Seguimiento: {formatDate(action.nextStepDate)}
                      </span>
                    ) : null}
                    {!statusText && !action.nextStepDate ? <span className="text-sm text-[#6c757d]">Sin seguimiento</span> : null}
                  </div>
                </Td>
                <Td className="w-[180px]">
                  <div className="flex flex-col items-start gap-2">
                    <LinkButton href={`/intervenciones/${intervention.id}/legajo.pdf?hoja=${sheetNumber}`} variant="secondary" target="_blank" rel="noreferrer" className="min-h-8 px-2.5 py-1 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </LinkButton>
                    {rowAttachments.map((attachment) => (
                      <AttachmentPreviewButton key={attachment.id} href={`/adjuntos/${attachment.id}`} name={attachment.originalName} mimeType={attachment.mimeType} compact />
                    ))}
                  </div>
                </Td>
              </LegajoInterventionRow>
            );
          })}

          <LegajoInterventionRow
            modalTitle="Intervencion NÂ° 1"
            modalContent={
              <InterventionReadContent
                date={intervention.attendedAt}
                actor={intervention.createdBy.name}
                role={intervention.createdBy.role}
                actionType={intervention.type}
                statusText={initialStatusText}
                description={intervention.description}
                guidance={intervention.guidanceProvided}
                nextStepDescription={null}
                nextStepDate={null}
                confidentialNotes={intervention.confidentialNotes}
                attachments={generalAttachments}
              />
            }
          >
            <Td className="w-[150px]">
              <span className="block font-semibold text-[#0667b0]">Intervencion NÂ° 1</span>
              <span className="mt-0.5 block text-xs text-[#6c757d]">Primera atencion</span>
            </Td>
            <Td className="w-[210px]">
              <span className="block font-semibold">{formatDateTime(intervention.attendedAt)}</span>
              <span className="mt-0.5 block text-xs text-[#6c757d]">{intervention.createdBy.name} Â· {labelFromValue(intervention.createdBy.role)}</span>
            </Td>
            <Td>
              <span className="block font-semibold">{labelFromValue(intervention.type)}</span>
              <span className="mt-1 block text-xs font-medium text-[#0667b0]">Clic para ver el detalle</span>
            </Td>
            <Td className="w-[230px]">
              <span className="rounded-sm border border-[#c3e6cb] bg-[#d4edda] px-2 py-0.5 text-xs font-semibold text-[#155724]">{initialStatusText}</span>
            </Td>
            <Td className="w-[180px]">
              <div className="flex flex-col items-start gap-2">
                <LinkButton href={`/intervenciones/${intervention.id}/legajo.pdf?hoja=1`} variant="secondary" target="_blank" rel="noreferrer" className="min-h-8 px-2.5 py-1 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </LinkButton>
                {generalAttachments.map((attachment) => (
                  <AttachmentPreviewButton key={attachment.id} href={`/adjuntos/${attachment.id}`} name={attachment.originalName} mimeType={attachment.mimeType} compact />
                ))}
              </div>
            </Td>
          </LegajoInterventionRow>
        </Table>
      </DetailSection>
    </main>
  );
}
