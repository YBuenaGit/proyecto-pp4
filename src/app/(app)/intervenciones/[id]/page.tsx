import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Plus, Send, Upload } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { AttachmentList, UploadForm } from "@/components/ui/attachments";
import { AuditTimeline, auditLogActionId, describeAuditLog } from "@/components/ui/audit-timeline";
import { Button, LinkButton } from "@/components/ui/button";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { FormField, inputClass, textareaClass } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { JURIDICAL_CONTEXT_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatDate, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessJuridical } from "@/lib/rbac";
import {
  addJuridicalAction,
  deriveJuridicalToDispatch,
  updateJuridicalIntervention,
  uploadJuridicalAttachment,
} from "../actions";
import { InterventionForm } from "../intervention-form";
import { AddJuridicalActionForm } from "./add-juridical-action-form";

function display(value: string | null | undefined) {
  return value?.trim() || "-";
}

type CaseHistoryEvent = {
  id: string;
  date: Date;
  title: string;
  actor: string;
  details: string[];
};

function CaseHistoryTimeline({ events }: { events: CaseHistoryEvent[] }) {
  if (!events.length) return <p className="text-sm text-slate-500">Sin movimientos registrados.</p>;

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-sky-200 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{event.title}</p>
            <span className="text-xs text-slate-500">{formatDateTime(event.date)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{event.actor}</p>
          {event.details.length ? (
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
              {event.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default async function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const { id } = await params;
  const [intervention, attachments, auditLogs, areas, types, contexts] = await Promise.all([
    prisma.juridicalIntervention.findUnique({
      where: { id },
      include: {
        person: true,
        complainants: { orderBy: { sortOrder: "asc" } },
        linkedPersons: { orderBy: { sortOrder: "asc" } },
        createdBy: true,
        actions: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
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
    prisma.attachment.findMany({
      where: { entityType: "JuridicalIntervention", entityId: id },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "JuridicalIntervention", entityId: id },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "intervention_context", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!intervention) notFound();
  const directivoCanSeeDispatch = canAccessDispatch(user);
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
  const auditedActionIds = new Set(auditLogs.map(auditLogActionId).filter((value): value is string => Boolean(value)));
  const auditHistoryEvents: CaseHistoryEvent[] = auditLogs
    .filter((log) => ["CREATE", "UPDATE", "STATUS_CHANGE", "ACTION"].includes(log.action))
    .map((log) => {
      const description = describeAuditLog(log);
      return {
        id: `audit-${log.id}`,
        date: log.createdAt,
        title: description.title,
        actor: description.actorLine,
        details: description.details,
      };
    });
  const actionHistoryEvents: CaseHistoryEvent[] = intervention.actions
    .filter((action) => !auditedActionIds.has(action.id))
    .filter((action) => !(action.actionType === "DERIVACION" && action.content.startsWith("Derivacion a Despacho:")))
    .map((action) => ({
      id: `action-${action.id}`,
      date: action.createdAt,
      title: labelFromValue(action.actionType),
      actor: `${action.createdBy.name} (${labelFromValue(action.createdBy.role)})`,
      details: [
        action.content,
        action.nextStepDate ? `Proximo paso: ${formatDate(action.nextStepDate)}.` : null,
      ].filter((item): item is string => Boolean(item)),
    }));
  const referralHistoryEvents: CaseHistoryEvent[] = [...intervention.destinationReferrals, ...intervention.originReferrals].map((referral) => ({
    id: `referral-${referral.id}`,
    date: referral.referredAt,
    title:
      referral.originJuridicalInterventionId === intervention.id
        ? `Derivacion a ${labelFromValue(referral.destinationModule)}`
        : `Derivacion recibida de ${labelFromValue(referral.originModule)}`,
    actor: `${referral.referredBy.name} (${labelFromValue(referral.referredBy.role)})`,
    details: [
      referral.summary,
      referral.status ? `Estado de derivacion: ${labelFromValue(referral.status)}.` : null,
      referral.visibleStatusForOrigin ? referral.visibleStatusForOrigin : null,
    ].filter((item): item is string => Boolean(item)),
  }));
  const attachmentHistoryEvents: CaseHistoryEvent[] = attachments.map((attachment) => ({
    id: `attachment-${attachment.id}`,
    date: attachment.createdAt,
    title: "Adjunto privado",
    actor: `${attachment.uploadedBy.name} (${labelFromValue(attachment.uploadedBy.role)})`,
    details: [`Adjunto ${attachment.originalName}.`],
  }));
  const caseHistoryEvents = [
    ...auditHistoryEvents,
    ...actionHistoryEvents,
    ...referralHistoryEvents,
    ...attachmentHistoryEvents,
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <PageHeader
        title={intervention.internalNumber}
        description="Detalle interno de Intervenciones Juridico-Institucionales. Este contenido no se expone a usuarios de Despacho."
        actions={
          <>
            <AppModal title={`Editar ${intervention.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar</>} triggerVariant="secondary" size="xl">
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
            <LinkButton href="/intervenciones" variant="secondary">Volver</LinkButton>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <DetailSection title="Datos principales">
            <FieldGrid>
              <DetailField label="Estado" value={<StatusBadge value={intervention.status} />} />
              <DetailField label="Urgencia" value={<StatusBadge value={intervention.urgency} />} />
              <DetailField label="Tipo" value={labelFromValue(intervention.type)} />
              <DetailField
                label="Contexto"
                value={
                  intervention.interventionContext
                    ? JURIDICAL_CONTEXT_LABELS[intervention.interventionContext] ?? labelFromValue(intervention.interventionContext)
                    : null
                }
              />
              <DetailField label="Oficio" value={intervention.oficioNumber} />
              <DetailField label="Expediente" value={intervention.expedienteNumber} />
              <DetailField label="Area derivada" value={intervention.derivedArea} />
              <DetailField label="Fecha de atencion" value={formatDateTime(intervention.attendedAt)} />
              <DetailField label="Carga en sistema" value={formatDateTime(intervention.createdAt)} />
              <DetailField label="Usuario que atendio" value={intervention.createdBy.name} />
              <DetailField label="Origen" value={labelFromValue(intervention.origin)} />
              <DetailField label="Ultimo estado" value={formatDateTime(intervention.lastStatusAt)} />
            </FieldGrid>
          </DetailSection>

          <DetailSection title="Persona denunciante">
            <div className="space-y-3">
              {complainants.map((complainant, index) => (
                <div key={`complainant-${index}`} className="rounded-md border border-slate-200 p-3">
                  {complainant.isAnonymous ? (
                    <p className="text-sm font-medium text-slate-900">Denunciante anonimo</p>
                  ) : (
                    <FieldGrid>
                      <DetailField label="Nombre" value={display([complainant.firstName, complainant.lastName].filter(Boolean).join(" "))} />
                      <DetailField label="DNI" value={display(complainant.dni)} />
                      <DetailField label="Telefono 1" value={display(complainant.phone1)} />
                      <DetailField label="Telefono 2" value={display(complainant.phone2)} />
                      <DetailField label="Domicilio" value={display(complainant.address)} />
                    </FieldGrid>
                  )}
                </div>
              ))}
              {!complainants.length ? <p className="text-sm text-slate-500">Sin denunciantes cargados.</p> : null}
            </div>
          </DetailSection>

          <DetailSection title="Persona vinculada / denunciada">
            <div className="space-y-3">
              {linkedPersons.map((person, index) => (
                <div key={`linked-person-${index}`} className="rounded-md border border-slate-200 p-3">
                  <FieldGrid>
                    <DetailField label="Nombre" value={display([person.firstName, person.apellidoApodoManual].filter(Boolean).join(" "))} />
                    <DetailField label="DNI" value={display(person.dni)} />
                    <DetailField label="Telefono 1" value={display(person.phone1)} />
                    <DetailField label="Telefono 2" value={display(person.phone2)} />
                    <DetailField label="Domicilio" value={display(person.address)} />
                    {index === 0 && intervention.personId ? (
                      <DetailField
                        label="Perfil"
                        value={<Link className="text-sky-800 hover:underline" href={`/personas/${intervention.personId}`}>Ver persona</Link>}
                      />
                    ) : null}
                  </FieldGrid>
                </div>
              ))}
              {!linkedPersons.length ? <p className="text-sm text-slate-500">Sin personas denunciadas o vinculadas cargadas.</p> : null}
            </div>
          </DetailSection>

          <DetailSection title="Contenido interno">
            <div className="space-y-4 text-sm leading-6 text-slate-800">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Descripcion</p>
                <p className="whitespace-pre-wrap">{intervention.description}</p>
              </div>
              {intervention.guidanceProvided ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Orientacion / intervencion realizada</p>
                  <p className="whitespace-pre-wrap">{intervention.guidanceProvided}</p>
                </div>
              ) : null}
              {intervention.confidentialNotes ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Notas internas confidenciales</p>
                  <p className="whitespace-pre-wrap">{intervention.confidentialNotes}</p>
                </div>
              ) : null}
            </div>
          </DetailSection>

          <DetailSection
            title={`Historial de seguimiento del caso ${intervention.internalNumber}`}
            action={
              <AppModal title="Agregar seguimiento" trigger={<><Plus className="h-4 w-4" />Agregar seguimiento</>} size="md">
                <AddJuridicalActionForm action={addJuridicalAction.bind(null, intervention.id)} />
              </AppModal>
            }
          >
            <CaseHistoryTimeline events={caseHistoryEvents} />
            <div className="hidden" aria-hidden="true">
              {intervention.actions.map((action) => (
                <div key={action.id} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{labelFromValue(action.actionType)} · {action.createdBy.name}</p>
                    <span className="text-xs text-slate-500">{formatDateTime(action.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{action.content}</p>
                  {action.nextStepDate ? <p className="mt-2 text-xs text-slate-500">Proximo paso: {formatDate(action.nextStepDate)}</p> : null}
                </div>
              ))}
              {!intervention.actions.length ? <p className="text-sm text-slate-500">Sin actuaciones.</p> : null}
            </div>
          </DetailSection>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Derivaciones">
            <div className="space-y-4">
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

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historial de derivaciones</p>
                <div className="space-y-2">
                  {[...intervention.destinationReferrals, ...intervention.originReferrals].map((referral) => (
                    <div key={referral.id} className="rounded-md bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-slate-900">{referral.originModule} → {referral.destinationModule}</p>
                      <p className="mt-1 text-slate-600">{referral.summary}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(referral.referredAt)}</p>
                      {directivoCanSeeDispatch && referral.destinationDispatchRecordId ? (
                        <Link className="mt-2 inline-block text-xs font-medium text-sky-800 hover:underline" href={`/despacho/${referral.destinationDispatchRecordId}`}>
                          Ver atencion vinculada
                        </Link>
                      ) : null}
                    </div>
                  ))}
                  {!intervention.destinationReferrals.length && !intervention.originReferrals.length ? (
                    <p className="text-sm text-slate-500">Sin derivaciones.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Adjuntos privados">
            <div className="space-y-4">
              <AttachmentList attachments={attachments} />
              <AppModal title="Adjuntar archivo" trigger={<><Upload className="h-4 w-4" />Adjuntar archivo</>} triggerVariant="secondary" size="md">
                <UploadForm action={uploadJuridicalAttachment.bind(null, intervention.id)} modal />
              </AppModal>
            </div>
          </DetailSection>

          <DetailSection title="Auditoria">
            <AuditTimeline logs={auditLogs} />
          </DetailSection>
        </aside>
      </div>
    </>
  );
}
