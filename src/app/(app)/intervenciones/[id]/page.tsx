import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Clock, Download, Edit, FileText, Plus, Send, Upload } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { AttachmentList, UploadForm } from "@/components/ui/attachments";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { Button, LinkButton } from "@/components/ui/button";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { FormField, inputClass, textareaClass } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { JURIDICAL_CONTEXT_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, labelFromValue } from "@/lib/format";
import { parseJuridicalActionContent } from "@/lib/juridical-action-content";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessJuridical } from "@/lib/rbac";
import {
  addJuridicalAction,
  deriveJuridicalToDispatch,
  updateJuridicalAction,
  updateJuridicalIntervention,
  uploadJuridicalAttachment,
} from "../actions";
import { InterventionForm } from "../intervention-form";
import { AddJuridicalActionForm } from "./add-juridical-action-form";

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
      <h3 className="text-sm font-semibold text-[#172033]">{title}</h3>
      <div className="mt-3 space-y-3">
        {people.length ? (
          people.map((person, index) => (
            <div key={`${title}-${index}`} className="rounded-lg bg-white px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ring-[#e4edf4]">
              {person.isAnonymous ? (
                <p className="font-semibold text-[#172033]">Denunciante anonimo</p>
              ) : (
                <>
                  <p className="font-semibold text-[#172033]">{display(fullName(person))}</p>
                  <p className="text-[#607589]">DNI: {display(person.dni)}</p>
                  <p className="text-[#607589]">Telefono: {display(phoneLine(person))}</p>
                  <p className="text-[#607589]">Domicilio: {display(person.address)}</p>
                  {index === 0 && profileHref ? (
                    <Link className="mt-1 inline-block font-semibold text-[#255f85] hover:underline" href={profileHref}>
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
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#607589]">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-[#172033]">{children}</p>
    </div>
  );
}

function SheetAttachments({ attachments }: { attachments: LegajoAttachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="rounded-lg bg-[#f6fafc] p-3 ring-1 ring-[#d7e4ee]">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#607589]">Adjuntos de esta hoja</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <Link
            key={attachment.id}
            href={`/adjuntos/${attachment.id}`}
            className="flex min-w-0 items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-[#172033] ring-1 ring-[#e4edf4] transition hover:ring-[#9bb8ca]"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#255f85]" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{attachment.originalName}</span>
              <span className="text-xs text-[#607589]">{Math.ceil(attachment.size / 1024)} KB · {attachment.uploadedBy.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LegajoSheet({
  sheetNumber,
  title,
  date,
  actor,
  role,
  description,
  guidance,
  actionType,
  statusText,
  nextStepDescription,
  nextStepDate,
  confidentialNotes,
  attachments,
  pdfHref,
  editAction,
}: {
  sheetNumber: number;
  title: string;
  date: Date;
  actor: string;
  role: string;
  description: string;
  guidance?: string | null;
  actionType?: string | null;
  statusText?: string | null;
  nextStepDescription?: string | null;
  nextStepDate?: Date | null;
  confidentialNotes?: string | null;
  attachments: LegajoAttachment[];
  pdfHref: string;
  editAction?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#d7e4ee] bg-white shadow-[0_16px_34px_rgba(26,68,104,0.08)]">
      <div className="border-b border-[#d7e4ee] bg-gradient-to-r from-[#f7fbfd] to-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#607589]">Hoja {sheetNumber}</p>
            <h3 className="mt-1 text-lg font-semibold text-[#172033]">{title}</h3>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#607589]">
              <span>{formatDateTime(date)}</span>
              <span>Registrado por: {actor} ({labelFromValue(role)})</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editAction}
            <LinkButton href={pdfHref} variant="secondary" target="_blank" rel="noreferrer" className="min-h-9 px-3 py-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              PDF hoja
            </LinkButton>
          </div>
        </div>
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {actionType ? <span className="rounded-md bg-[#eaf3f8] px-2.5 py-1 text-xs font-semibold text-[#2f4c63]">{labelFromValue(actionType)}</span> : null}
          {statusText ? <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{statusText}</span> : null}
          {nextStepDate ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <Clock className="h-3.5 w-3.5" />
              Seguimiento: {formatDate(nextStepDate)}
            </span>
          ) : null}
        </div>
        <SheetText label="Descripcion / relato">{description}</SheetText>
        <SheetText label="Intervencion realizada / orientacion brindada">{guidance}</SheetText>
        <SheetText label="Proxima accion">{nextStepDescription}</SheetText>
        <SheetText label="Notas internas confidenciales">{confidentialNotes}</SheetText>
        <SheetAttachments attachments={attachments} />
      </div>
    </article>
  );
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

  const directivoCanSeeDispatch = canAccessDispatch(user);
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
  const lastAudit = auditLogs[0] ?? null;
  const referrals = [...intervention.destinationReferrals, ...intervention.originReferrals];
  const nextAction = visibleActions
    .filter((action) => action.nextStepDate && action.nextStepDate >= new Date())
    .sort((a, b) => (a.nextStepDate?.getTime() ?? 0) - (b.nextStepDate?.getTime() ?? 0))[0];

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-[#d7e4ee] bg-gradient-to-br from-[#fbfdff] to-[#edf5f9] p-4 shadow-[0_18px_42px_rgba(26,68,104,0.08)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#607589]">Secretaria de Seguridad</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#172033] sm:text-3xl">Legajo de la intervencion {intervention.internalNumber}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/80 px-2.5 py-1 text-sm font-semibold text-[#2f4c63] ring-1 ring-[#d7e4ee]">{labelFromValue(intervention.type)}</span>
              <StatusBadge value={intervention.status} className="w-auto max-w-none" />
              <StatusBadge value={intervention.urgency} className="w-auto max-w-none" />
              <span className="rounded-md bg-white/80 px-2.5 py-1 text-sm font-semibold text-[#607589] ring-1 ring-[#d7e4ee]">
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
            <AppModal title="Nuevo registro de intervencion" description="Crea una nueva hoja documental dentro de este legajo." trigger={<><Plus className="h-4 w-4" />Nueva hoja</>} size="md">
              <AddJuridicalActionForm action={addJuridicalAction.bind(null, intervention.id)} submitLabel="Crear hoja" />
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#d7e4ee] bg-[#fbfdff] p-4 shadow-[0_18px_42px_rgba(26,68,104,0.08)] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#172033]">Legajo de la intervencion</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#607589]">
                  Registros documentales de todas las actuaciones y presentaciones vinculadas a esta intervencion.
                </p>
              </div>
              <AppModal title="Nuevo registro de intervencion" description="Crea una nueva hoja documental dentro de este legajo." trigger={<><Plus className="h-4 w-4" />Nueva hoja</>} size="md">
                <AddJuridicalActionForm action={addJuridicalAction.bind(null, intervention.id)} submitLabel="Crear hoja" />
              </AppModal>
            </div>
          </div>

          <div className="space-y-4">
            {displayActionSheets.map(({ action, sheetNumber, parsed, statusText }) => (
              <LegajoSheet
                key={action.id}
                sheetNumber={sheetNumber}
                title={labelFromValue(action.actionType)}
                date={action.createdAt}
                actor={action.createdBy.name}
                role={action.createdBy.role}
                description={parsed.description}
                guidance={parsed.guidanceProvided}
                actionType={action.actionType}
                statusText={statusText}
                nextStepDescription={parsed.nextStepDescription}
                nextStepDate={action.nextStepDate}
                attachments={attachmentsByActionId.get(action.id) ?? []}
                pdfHref={`/intervenciones/${intervention.id}/legajo.pdf?hoja=${sheetNumber}`}
                editAction={
                  <AppModal title={`Editar hoja ${sheetNumber}`} trigger={<><Edit className="h-3.5 w-3.5" />Editar hoja</>} triggerVariant="secondary" size="md" triggerClassName="min-h-9 px-3 py-1.5 text-xs">
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
                      submitLabel="Guardar hoja"
                    />
                  </AppModal>
                }
              />
            ))}

            <LegajoSheet
              sheetNumber={1}
              title="Primera atencion"
              date={intervention.attendedAt}
              actor={intervention.createdBy.name}
              role={intervention.createdBy.role}
              description={intervention.description}
              guidance={intervention.guidanceProvided}
              actionType={intervention.type}
              statusText={`Estado inicial: ${labelFromValue(initialStatusFromAudit(auditLogs, intervention.status))}`}
              nextStepDescription={null}
              nextStepDate={null}
              confidentialNotes={intervention.confidentialNotes}
              attachments={[]}
              pdfHref={`/intervenciones/${intervention.id}/legajo.pdf?hoja=1`}
            />
          </div>
        </section>

        <aside className="space-y-5">
          <DetailSection title="Acciones rapidas">
            <div className="grid gap-2">
              <AppModal title="Nuevo registro de intervencion" description="Crea una nueva hoja documental dentro de este legajo." trigger={<><Plus className="h-4 w-4" />Nueva hoja</>} size="md">
                <AddJuridicalActionForm action={addJuridicalAction.bind(null, intervention.id)} submitLabel="Crear hoja" />
              </AppModal>
              <AppModal title="Adjuntar archivo general" trigger={<><Upload className="h-4 w-4" />Adjuntar archivo</>} triggerVariant="secondary" size="md">
                <UploadForm action={uploadJuridicalAttachment.bind(null, intervention.id)} modal />
              </AppModal>
              <AppModal title="Derivar a Despacho" trigger={<><Send className="h-4 w-4" />Derivar a Despacho</>} triggerVariant="secondary" size="md">
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
              <LinkButton href={`/intervenciones/${intervention.id}/legajo.pdf`} variant="secondary" target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Descargar legajo PDF
              </LinkButton>
            </div>
          </DetailSection>

          <DetailSection title="Estado actual">
            <div className="space-y-3 text-sm leading-6">
              <DetailField label="Estado" value={<StatusBadge value={intervention.status} />} />
              <DetailField label="Urgencia" value={<StatusBadge value={intervention.urgency} />} />
              <DetailField label="Ultima actualizacion" value={formatDateTime(intervention.lastStatusAt)} />
              <DetailField label="Proxima accion" value={nextAction?.nextStepDate ? `${labelFromValue(nextAction.actionType)} - ${formatDate(nextAction.nextStepDate)}` : "Sin fecha programada"} />
            </div>
          </DetailSection>

          <DetailSection title="Derivaciones">
            <div className="space-y-2">
              {referrals.map((referral) => (
                <div key={referral.id} className="rounded-lg bg-[#f6fafc] p-3 text-sm ring-1 ring-[#d7e4ee]">
                  <p className="font-semibold text-[#172033]">
                    {referral.originModule} {"->"} {referral.destinationModule}
                  </p>
                  <p className="mt-1 leading-6 text-[#334b5f]">{referral.summary}</p>
                  <p className="mt-1 text-xs text-[#607589]">{formatDateTime(referral.referredAt)}</p>
                  {directivoCanSeeDispatch && referral.destinationDispatchRecordId ? (
                    <Link className="mt-2 inline-block text-xs font-semibold text-[#255f85] hover:underline" href={`/despacho/${referral.destinationDispatchRecordId}`}>
                      Ver atencion vinculada
                    </Link>
                  ) : null}
                </div>
              ))}
              {!referrals.length ? <p className="text-sm text-[#607589]">Sin derivaciones.</p> : null}
            </div>
          </DetailSection>

          <DetailSection title="Adjuntos privados">
            <AttachmentList attachments={generalAttachments} />
          </DetailSection>

          <DetailSection title="Auditoria tecnica">
            <div className="space-y-3">
              <div className="rounded-lg bg-[#f6fafc] p-3 text-sm leading-6 ring-1 ring-[#d7e4ee]">
                {lastAudit ? (
                  <>
                    <p className="font-semibold text-[#172033]">Ultima modificacion</p>
                    <p className="text-[#607589]">{lastAudit.createdBy?.name ?? "Sistema"}</p>
                    <p className="text-[#607589]">{formatDateTime(lastAudit.createdAt)}</p>
                  </>
                ) : (
                  <p className="text-[#607589]">Sin auditoria registrada.</p>
                )}
              </div>
              <AppModal title="Historial completo de auditoria" trigger="Ver historial completo" triggerVariant="secondary" size="lg">
                <AuditTimeline logs={auditLogs} />
              </AppModal>
            </div>
          </DetailSection>
        </aside>
      </div>
    </main>
  );
}
