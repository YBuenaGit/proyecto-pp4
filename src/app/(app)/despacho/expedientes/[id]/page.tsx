import { notFound } from "next/navigation";
import { Edit, Upload } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { AttachmentList, UploadForm } from "@/components/ui/attachments";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { LinkButton } from "@/components/ui/button";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessExpedients } from "@/lib/rbac";
import { updateExpedient, uploadExpedientAttachment } from "../../actions";
import { ExpedientForm } from "../expedient-form";

export default async function ExpedientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const { id } = await params;
  const [expedient, attachments, auditLogs, categories] = await Promise.all([
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
  ]);
  if (!expedient) notFound();

  return (
    <>
      <PageHeader
        title={expedient.internalNumber}
        description="Detalle de expediente administrativo interno."
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
              <DetailField label="Categoria" value={labelFromValue(expedient.category)} />
              <DetailField label="Numero expediente" value={expedient.expedienteNumber} />
              <DetailField label="Creado" value={formatDateTime(expedient.createdAt)} />
              <DetailField label="Actualizado" value={formatDateTime(expedient.updatedAt)} />
              <DetailField label="Usuario" value={expedient.createdBy.name} />
            </FieldGrid>
          </DetailSection>
          <DetailSection title="Descripcion">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{expedient.description}</p>
          </DetailSection>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Adjuntos">
            <div className="space-y-4">
              <AttachmentList attachments={attachments} />
              <AppModal title="Adjuntar archivo" trigger={<><Upload className="h-4 w-4" />Adjuntar archivo</>} triggerVariant="secondary" size="md">
                <UploadForm action={uploadExpedientAttachment.bind(null, expedient.id)} modal />
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
