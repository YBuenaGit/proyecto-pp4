import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Send } from "lucide-react";
import { AttachmentList, UploadForm } from "@/components/ui/attachments";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { Button, LinkButton } from "@/components/ui/button";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { FormField, inputClass, textareaClass } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { DISPATCH_STATUSES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessJuridical } from "@/lib/rbac";
import {
  addDispatchFollowUp,
  deriveDispatchToJuridical,
  referDispatchToArea,
  uploadDispatchAttachment,
} from "../actions";

export default async function DispatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const { id } = await params;

  const [record, attachments, auditLogs, areas, juridicalTypes] = await Promise.all([
    prisma.dispatchRecord.findUnique({
      where: { id },
      include: {
        person: true,
        createdBy: true,
        followUps: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
        originReferrals: {
          include: { destinationJuridicalIntervention: true, referredBy: true },
          orderBy: { referredAt: "desc" },
        },
        destinationReferrals: {
          include: { originJuridicalIntervention: true, referredBy: true },
          orderBy: { referredAt: "desc" },
        },
      },
    }),
    prisma.attachment.findMany({
      where: { entityType: "DispatchRecord", entityId: id },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "DispatchRecord", entityId: id },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!record) notFound();
  const directivoCanSeeJuridical = canAccessJuridical(user);

  return (
    <>
      <PageHeader
        title={record.internalNumber}
        description="Detalle de atencion de Despacho con seguimientos, adjuntos, derivaciones y auditoria."
        actions={
          <>
            <LinkButton href={`/despacho/${record.id}/editar`} variant="secondary">
              <Edit className="h-4 w-4" />
              Editar
            </LinkButton>
            <LinkButton href="/despacho" variant="secondary">Volver</LinkButton>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailSection title="Datos principales">
            <FieldGrid>
              <DetailField label="Estado" value={<StatusBadge value={record.status} />} />
              <DetailField label="Prioridad" value={<StatusBadge value={record.priority} />} />
              <DetailField label="Categoria" value={labelFromValue(record.category)} />
              <DetailField label="Subcategoria" value={record.subcategory} />
              <DetailField label="Fecha de atencion" value={formatDateTime(record.attendedAt)} />
              <DetailField label="Usuario que atendio" value={record.createdBy.name} />
              <DetailField label="Origen" value={labelFromValue(record.origin)} />
              <DetailField label="Area derivada" value={record.referredArea} />
              <DetailField label="Ultimo estado" value={formatDateTime(record.lastStatusAt)} />
            </FieldGrid>
          </DetailSection>

          <DetailSection title="Persona">
            <FieldGrid>
              <DetailField label="Nombre" value={record.nameSnapshot ?? record.manualPersonName ?? "Sin identificar"} />
              <DetailField label="DNI" value={record.dniSnapshot} />
              <DetailField label="Telefono 1" value={record.person?.phone1} />
              <DetailField label="Telefono 2" value={record.person?.phone2} />
              <DetailField label="Domicilio" value={record.person?.address} />
              <DetailField
                label="Perfil"
                value={record.personId ? <Link className="text-sky-800 hover:underline" href={`/personas/${record.personId}`}>Ver persona</Link> : "-"}
              />
            </FieldGrid>
          </DetailSection>

          <DetailSection title="Descripcion y notas">
            <div className="space-y-4 text-sm leading-6 text-slate-800">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Descripcion</p>
                <p className="whitespace-pre-wrap">{record.description}</p>
              </div>
              {record.notes ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Notas internas</p>
                  <p className="whitespace-pre-wrap">{record.notes}</p>
                </div>
              ) : null}
              {record.confidentialSummary ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Resumen confidencial</p>
                  <p className="whitespace-pre-wrap">{record.confidentialSummary}</p>
                </div>
              ) : null}
            </div>
          </DetailSection>

          <DetailSection title="Seguimientos">
            <form action={addDispatchFollowUp.bind(null, record.id)} className="mb-5 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <FormField label="Nuevo seguimiento">
                <textarea name="content" className={textareaClass} required />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <FormField label="Estado posterior">
                  <select name="statusAfter" className={inputClass} defaultValue="">
                    <option value="">Sin cambio</option>
                    {DISPATCH_STATUSES.map((status) => (
                      <option key={status} value={status}>{labelFromValue(status)}</option>
                    ))}
                  </select>
                </FormField>
                <div className="flex items-end">
                  <Button type="submit">Agregar seguimiento</Button>
                </div>
              </div>
            </form>
            <div className="space-y-3">
              {record.followUps.map((followUp) => (
                <div key={followUp.id} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{followUp.createdBy.name}</p>
                    <span className="text-xs text-slate-500">{formatDateTime(followUp.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{followUp.content}</p>
                  {followUp.statusAfter ? <div className="mt-2"><StatusBadge value={followUp.statusAfter} /></div> : null}
                </div>
              ))}
              {!record.followUps.length ? <p className="text-sm text-slate-500">Sin seguimientos.</p> : null}
            </div>
          </DetailSection>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Derivaciones">
            <div className="space-y-4">
              <form action={deriveDispatchToJuridical.bind(null, record.id)} className="space-y-3">
                <FormField label="Derivar a Intervenciones">
                  <textarea name="summary" className={textareaClass} placeholder="Resumen necesario para continuar la intervencion" />
                </FormField>
                <FormField label="Tipo sugerido">
                  <select name="type" className={inputClass} defaultValue="PRIMERA_INTERVENCION">
                    {juridicalTypes.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </FormField>
                <Button type="submit" variant="secondary">
                  <Send className="h-4 w-4" />
                  Derivar a Intervenciones
                </Button>
              </form>

              <form action={referDispatchToArea.bind(null, record.id)} className="space-y-3 border-t border-slate-200 pt-4">
                <FormField label="Derivar a otra area">
                  <select name="area" className={inputClass} defaultValue="">
                    <option value="">Seleccionar area</option>
                    {areas.map((item) => (
                      <option key={item.value} value={item.label}>{item.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Resumen">
                  <textarea name="summary" className={textareaClass} />
                </FormField>
                <Button type="submit" variant="secondary">Derivar a area</Button>
              </form>

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historial de derivaciones</p>
                <div className="space-y-2">
                  {[...record.originReferrals, ...record.destinationReferrals].map((referral) => (
                    <div key={referral.id} className="rounded-md bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-slate-900">{referral.originModule} → {referral.destinationModule}</p>
                      <p className="mt-1 text-slate-600">{referral.visibleStatusForOrigin}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(referral.referredAt)}</p>
                      {directivoCanSeeJuridical && referral.destinationJuridicalInterventionId ? (
                        <Link className="mt-2 inline-block text-xs font-medium text-sky-800 hover:underline" href={`/intervenciones/${referral.destinationJuridicalInterventionId}`}>
                          Ver intervencion vinculada
                        </Link>
                      ) : null}
                    </div>
                  ))}
                  {!record.originReferrals.length && !record.destinationReferrals.length ? (
                    <p className="text-sm text-slate-500">Sin derivaciones.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Adjuntos">
            <div className="space-y-4">
              <AttachmentList attachments={attachments} />
              <UploadForm action={uploadDispatchAttachment.bind(null, record.id)} />
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
