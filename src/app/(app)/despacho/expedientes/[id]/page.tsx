import { notFound } from "next/navigation";
import { Edit, Upload } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { AttachmentList, UploadForm } from "@/components/ui/attachments";
import { AuditChangeTable } from "@/components/ui/audit-change-table";
import { LinkButton } from "@/components/ui/button";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import type { LegajoObservationItem } from "@/components/ui/legajo-observations";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  projectAuditChanges,
  type AuditFieldDescriptor,
} from "@/lib/audit-changes";
import { requireUser } from "@/lib/auth";
import { EXPEDIENT_AREAS } from "@/lib/constants";
import { codigoExpedienteLabel } from "@/lib/constants/codigosExpedientes";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessExpedients } from "@/lib/rbac";
import {
  addExpedientFollowUp,
  updateExpedient,
  uploadExpedientAttachment,
} from "../../actions";
import { ExpedientForm } from "../expedient-form";
import { ExpedientFollowUps } from "./expedient-follow-ups";

function auditText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default async function ExpedientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const { id } = await params;
  const [expedient, attachments, auditLogs, categories, observations] = await Promise.all([
    prisma.internalExpedient.findUnique({ where: { id }, include: { createdBy: true } }),
    prisma.attachment.findMany({
      where: { entityType: "InternalExpedient", entityId: id },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "InternalExpedient", entityId: id },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.catalogItem.findMany({ where: { type: "expedient_category", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.legajoObservation.findMany({
      where: {
        module: "DESPACHO",
        entityType: "InternalExpedient",
        entityId: id,
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!expedient) notFound();
  const followUpAttachments = observations.length
    ? await prisma.attachment.findMany({
        where: {
          module: "DESPACHO",
          entityType: "LegajoObservation",
          entityId: { in: observations.map((observation) => observation.id) },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const attachmentsByObservationId = new Map<
    string,
    Array<{ id: string; originalName: string; mimeType: string }>
  >();
  followUpAttachments.forEach((attachment) => {
    const current = attachmentsByObservationId.get(attachment.entityId) ?? [];
    current.push({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    });
    attachmentsByObservationId.set(attachment.entityId, current);
  });
  const followUps: LegajoObservationItem[] = observations.map((observation) => ({
    ...observation,
    attachments: attachmentsByObservationId.get(observation.id) ?? [],
  }));
  const categoryLabel = categories.find((item) => item.value === expedient.category)?.label ?? labelFromValue(expedient.category);
  const areaLabel = EXPEDIENT_AREAS.find((item) => item.value === expedient.area)?.label ?? labelFromValue(expedient.area);
  const auditFields = [
    { key: "expedienteNumber", label: "Número de expediente" },
    {
      key: "codigo",
      label: "Código",
      format: (value: unknown) => {
        const code = auditText(value);
        return code ? codigoExpedienteLabel(code) : "";
      },
    },
    {
      key: "category",
      label: "Categoría",
      format: (value: unknown) => {
        const category = auditText(value);
        return category
          ? categories.find((item) => item.value === category)?.label ??
              labelFromValue(category)
          : "";
      },
    },
    {
      key: "area",
      label: "Área",
      format: (value: unknown) => {
        const area = auditText(value);
        return area
          ? EXPEDIENT_AREAS.find((item) => item.value === area)?.label ??
              labelFromValue(area)
          : "";
      },
    },
    { key: "description", label: "Descripción" },
    { key: "observation", label: "Observación inicial" },
    {
      key: "deadlineAt",
      label: "Plazo",
      format: (value: unknown) => {
        const deadline = auditText(value);
        return deadline ? formatDateTime(deadline) : "";
      },
    },
    {
      key: "status",
      label: "Estado",
      format: (value: unknown) => {
        const status = auditText(value);
        return status ? labelFromValue(status) : "";
      },
    },
  ] satisfies AuditFieldDescriptor[];
  const auditRows = projectAuditChanges(auditLogs, auditFields);

  return (
    <>
      <PageHeader
        title={expedient.internalNumber}
        description="Detalle de expediente administrativo interno."
        breadcrumbs={[{ label: "Anuncios importantes", href: "/" }, { label: "Despacho", href: "/despacho" }, { label: "Expedientes internos", href: "/despacho/expedientes" }, { label: expedient.internalNumber }]}
        actions={
          <>
            <AppModal title={`Editar ${expedient.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar</>} triggerVariant="secondary" size="lg">
              <ExpedientForm
                action={updateExpedient.bind(null, expedient.id)}
                record={expedient}
                categories={categories.map((item) => ({ value: item.value, label: item.label }))}
                backHref={`/despacho/expedientes/${expedient.id}`}
                modal
                submitLabel="Guardar cambios"
              />
            </AppModal>
            <LinkButton href="/despacho/expedientes" variant="secondary">Volver</LinkButton>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailSection title="Datos del expediente">
            <FieldGrid>
              <DetailField label="Estado" value={<StatusBadge value={expedient.status} />} />
              <DetailField label="Categoria" value={categoryLabel} />
              <DetailField label="Area" value={areaLabel} />
              <DetailField label="Código" value={codigoExpedienteLabel(expedient.codigo)} />
              <DetailField label="Descripcion" value={expedient.description} />
              <DetailField label="Numero expediente" value={expedient.expedienteNumber} />
              <DetailField label="Plazo" value={expedient.deadlineAt ? formatDateTime(expedient.deadlineAt) : "Sin plazo"} />
              <DetailField label="Creado" value={formatDateTime(expedient.createdAt)} />
              <DetailField label="Actualizado" value={formatDateTime(expedient.updatedAt)} />
              <DetailField label="Usuario" value={expedient.createdBy.name} />
            </FieldGrid>
          </DetailSection>
          <DetailSection title="Observación inicial">
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#212529]">{expedient.observation || "-"}</p>
          </DetailSection>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Adjuntos">
            <div className="space-y-4">
              <AttachmentList attachments={attachments} />
              <AppModal title="Adjuntar archivo" trigger={<><Upload className="h-4 w-4" />Adjuntar archivo</>} triggerVariant="secondary" size="md">
                <UploadForm
                  action={uploadExpedientAttachment.bind(null, expedient.id)}
                  intent={{
                    module: "DESPACHO",
                    entityType: "InternalExpedient",
                    scopeId: expedient.id,
                  }}
                  modal
                />
              </AppModal>
            </div>
          </DetailSection>
        </aside>
      </div>

      <div className="mt-5 space-y-5">
        <ExpedientFollowUps
          expedientId={expedient.id}
          observations={followUps}
          action={addExpedientFollowUp.bind(null, expedient.id)}
        />
        <AuditChangeTable rows={auditRows} />
      </div>
    </>
  );
}
