import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Plus, Send, Upload } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
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
  updateDispatchRecord,
  uploadDispatchAttachment,
} from "../actions";
import { DispatchForm } from "../dispatch-form";

type StoredLinkedPerson = {
  dni?: string | null;
  firstName?: string | null;
  apellidoApodoManual?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
};

function display(value: string | null | undefined) {
  return value?.trim() || "Sin dato";
}

function hasLinkedPersonData(person: StoredLinkedPerson) {
  return Boolean(person.dni || person.firstName || person.apellidoApodoManual || person.phone1 || person.phone2 || person.address);
}

export default async function DispatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const { id } = await params;

  const [record, attachments, auditLogs, categories, areas, juridicalTypes] = await Promise.all([
    prisma.dispatchRecord.findUnique({
      where: { id },
      include: {
        person: true,
        createdBy: true,
        complainants: { orderBy: { sortOrder: "asc" } },
        linkedPersons: { orderBy: { sortOrder: "asc" } },
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
    prisma.catalogItem.findMany({ where: { type: "dispatch_category", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!record) notFound();
  const directivoCanSeeJuridical = canAccessJuridical(user);
  const complainants = record.complainants;
  const linkedPersons = record.linkedPersons.length
    ? record.linkedPersons
    : [
        {
          dni: record.dniSnapshot,
          firstName: record.person?.firstName,
          apellidoApodoManual: record.person?.lastName ?? record.nameSnapshot,
          phone1: record.person?.phone1,
          phone2: record.person?.phone2,
          address: record.person?.address,
        },
      ].filter(hasLinkedPersonData);

  return (
    <>
      <PageHeader
        title={record.internalNumber}
        description="Detalle de atencion de Despacho con seguimientos, adjuntos, derivaciones y auditoria."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Despacho", href: "/despacho" }, { label: record.internalNumber }]}
        actions={
          <>
            <AppModal title={`Editar ${record.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar</>} triggerVariant="secondary" size="xl">
              <DispatchForm
                action={updateDispatchRecord.bind(null, record.id)}
                record={record}
                categories={categories.map((item) => ({ value: item.value, label: item.label }))}
                areas={areas.map((item) => ({ value: item.value, label: item.label }))}
                backHref={`/despacho/${record.id}`}
                modal
                submitLabel="Guardar cambios"
              />
            </AppModal>
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
              <DetailField label="Fecha de atencion" value={formatDateTime(record.attendedAt)} />
              <DetailField label="Carga en sistema" value={formatDateTime(record.createdAt)} />
              <DetailField label="Usuario que atendio" value={record.createdBy.name} />
              <DetailField label="Origen" value={labelFromValue(record.origin)} />
              <DetailField label="Area derivada" value={record.referredArea} />
              <DetailField label="Ultimo estado" value={formatDateTime(record.lastStatusAt)} />
            </FieldGrid>
          </DetailSection>

          <DetailSection title="Personas denunciantes">
            <div className="space-y-4">
              {complainants.map((complainant, index) => (
                <div key={`complainant-${index}`} className="rounded-md border border-[#dee2e6] p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Denunciante {index + 1}</p>
                  {complainant.isAnonymous ? (
                    <p className="text-sm font-medium text-[#212529]">Denunciante anónimo</p>
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
              {!complainants.length ? <p className="text-sm text-[#6c757d]">Sin denunciantes cargados.</p> : null}
            </div>
          </DetailSection>

          <DetailSection title="Personas denunciadas / vinculadas">
            <div className="space-y-4">
              {linkedPersons.map((person, index) => (
                <div key={`linked-person-${index}`} className="rounded-md border border-[#dee2e6] p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Persona {index + 1}</p>
                  <FieldGrid>
                    <DetailField label="Nombre" value={display(person.firstName)} />
                    <DetailField label="Apellido / Apodo manual" value={display(person.apellidoApodoManual)} />
                    <DetailField label="DNI" value={display(person.dni)} />
                    <DetailField label="Telefono 1" value={display(person.phone1)} />
                    <DetailField label="Telefono 2" value={display(person.phone2)} />
                    <DetailField label="Domicilio" value={display(person.address)} />
                    {index === 0 ? (
                      <DetailField
                        label="Perfil"
                        value={record.personId ? <Link className="text-[#0667b0] hover:underline" href={`/personas/${record.personId}`}>Ver persona</Link> : "-"}
                      />
                    ) : null}
                  </FieldGrid>
                </div>
              ))}
              {!linkedPersons.length ? <p className="text-sm text-[#6c757d]">Sin personas denunciadas o vinculadas cargadas.</p> : null}
            </div>
          </DetailSection>

          <DetailSection title="Descripcion y notas">
            <div className="space-y-4 text-sm leading-6 text-[#212529]">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6c757d]">Descripcion</p>
                <p className="whitespace-pre-wrap">{record.description}</p>
              </div>
              {record.initialGuidance ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6c757d]">Orientacion brindada / intervencion inicial</p>
                  <p className="whitespace-pre-wrap">{record.initialGuidance}</p>
                </div>
              ) : null}
              {record.confidentialNotes ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6c757d]">Notas internas confidenciales</p>
                  <p className="whitespace-pre-wrap">{record.confidentialNotes}</p>
                </div>
              ) : null}
            </div>
          </DetailSection>

          <DetailSection
            title="Seguimientos"
            action={
              <AppModal title="Agregar seguimiento" trigger={<><Plus className="h-4 w-4" />Agregar seguimiento</>} size="md">
                <form action={addDispatchFollowUp.bind(null, record.id)} className="space-y-4">
                  <FormField label="Nuevo seguimiento">
                    <textarea name="content" className={textareaClass} required />
                  </FormField>
                  <FormField label="Estado posterior">
                    <select name="statusAfter" className={inputClass} defaultValue="">
                      <option value="">Sin cambio</option>
                      {DISPATCH_STATUSES.map((status) => (
                        <option key={status} value={status}>{labelFromValue(status)}</option>
                      ))}
                    </select>
                  </FormField>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit">Guardar</Button>
                    <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                  </div>
                </form>
              </AppModal>
            }
          >
            <div className="space-y-3">
              {record.followUps.map((followUp) => (
                <div key={followUp.id} className="rounded-md border border-[#dee2e6] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#212529]">{followUp.createdBy.name}</p>
                    <span className="text-xs text-[#6c757d]">{formatDateTime(followUp.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[#495057]">{followUp.content}</p>
                  {followUp.statusAfter ? <div className="mt-2"><StatusBadge value={followUp.statusAfter} /></div> : null}
                </div>
              ))}
              {!record.followUps.length ? <p className="text-sm text-[#6c757d]">Sin seguimientos.</p> : null}
            </div>
          </DetailSection>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Derivaciones">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <AppModal title="Derivar a Intervenciones" trigger={<><Send className="h-4 w-4" />Derivar a Intervenciones</>} triggerVariant="secondary" size="md">
                  <form action={deriveDispatchToJuridical.bind(null, record.id)} className="space-y-4">
                    <FormField label="Derivar a Intervenciones">
                      <textarea name="summary" className={textareaClass} placeholder="Resumen necesario para continuar la intervencion" required />
                    </FormField>
                    <FormField label="Tipo sugerido">
                      <select name="type" className={inputClass} defaultValue="PRIMERA_INTERVENCION">
                        {juridicalTypes.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </FormField>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="submit">Guardar</Button>
                      <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                    </div>
                  </form>
                </AppModal>
                <AppModal title="Derivar a otra area" trigger="Derivar a area" triggerVariant="secondary" size="md">
                  <form action={referDispatchToArea.bind(null, record.id)} className="space-y-4">
                    <FormField label="Derivar a otra area">
                      <select name="area" className={inputClass} defaultValue="" required>
                        <option value="">Seleccionar area</option>
                        {areas.map((item) => (
                          <option key={item.value} value={item.label}>{item.label}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Resumen">
                      <textarea name="summary" className={textareaClass} required />
                    </FormField>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="submit">Guardar</Button>
                      <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                    </div>
                  </form>
                </AppModal>
              </div>

              <div className="border-t border-[#dee2e6] pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Historial de derivaciones</p>
                <div className="space-y-2">
                  {[...record.originReferrals, ...record.destinationReferrals].map((referral) => (
                    <div key={referral.id} className="rounded-md bg-[#f8f9fa] p-3 text-sm">
                      <p className="font-medium text-[#212529]">{referral.originModule} → {referral.destinationModule}</p>
                      <p className="mt-1 text-[#6c757d]">{referral.visibleStatusForOrigin}</p>
                      <p className="mt-1 text-xs text-[#6c757d]">{formatDateTime(referral.referredAt)}</p>
                      {directivoCanSeeJuridical && referral.destinationJuridicalInterventionId ? (
                        <Link className="mt-2 inline-block text-xs font-medium text-[#0667b0] hover:underline" href={`/intervenciones/${referral.destinationJuridicalInterventionId}`}>
                          Ver intervencion vinculada
                        </Link>
                      ) : null}
                    </div>
                  ))}
                  {!record.originReferrals.length && !record.destinationReferrals.length ? (
                    <p className="text-sm text-[#6c757d]">Sin derivaciones.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Adjuntos">
            <div className="space-y-4">
              <AttachmentList attachments={attachments} />
              <AppModal title="Adjuntar archivo" trigger={<><Upload className="h-4 w-4" />Adjuntar archivo</>} triggerVariant="secondary" size="md">
                <UploadForm action={uploadDispatchAttachment.bind(null, record.id)} modal />
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
