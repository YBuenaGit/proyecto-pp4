import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessExpedients } from "@/lib/rbac";
import { updateExpedient } from "../../../actions";
import { ExpedientForm } from "../../expedient-form";

export default async function EditExpedientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const { id } = await params;
  const [expedient, categories] = await Promise.all([
    prisma.internalExpedient.findUnique({ where: { id } }),
    prisma.catalogItem.findMany({ where: { type: "expedient_category", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!expedient) notFound();

  return (
    <>
      <PageHeader
        title={`Editar ${expedient.internalNumber}`}
        description="Actualizacion de expediente interno con auditoria."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Despacho", href: "/despacho" }, { label: "Expedientes internos", href: "/despacho/expedientes" }, { label: expedient.internalNumber, href: `/despacho/expedientes/${expedient.id}` }, { label: "Editar" }]}
        actions={
          <>
            <AppModal title={`Editar ${expedient.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar</>} size="lg">
              <ExpedientForm
                action={updateExpedient.bind(null, expedient.id)}
                record={expedient}
                categories={categories.map((item) => ({ value: item.value, label: item.label }))}
                backHref={`/despacho/expedientes/${expedient.id}`}
                modal
                submitLabel="Guardar cambios"
              />
            </AppModal>
            <LinkButton href={`/despacho/expedientes/${expedient.id}`} variant="secondary">Volver</LinkButton>
          </>
        }
      />
      <p className="text-sm text-[#212529]">La informacion se edita desde el modal para mantener separada la lectura de la modificacion.</p>
    </>
  );
}
