import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch } from "@/lib/rbac";
import { updateDispatchRecord } from "../../actions";
import { DispatchForm } from "../../dispatch-form";

export default async function EditDispatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const { id } = await params;
  const [record, categories, areas] = await Promise.all([
    prisma.dispatchRecord.findUnique({
      where: { id },
      include: {
        person: true,
        complainants: { orderBy: { sortOrder: "asc" } },
        linkedPersons: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_category", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!record) notFound();

  return (
    <>
      <PageHeader
        title={`Editar ${record.internalNumber}`}
        description="Los cambios quedan registrados en auditoria."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Despacho", href: "/despacho" }, { label: record.internalNumber, href: `/despacho/${record.id}` }, { label: "Editar" }]}
        actions={
          <>
            <AppModal title={`Editar ${record.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar</>} size="xl">
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
            <LinkButton href={`/despacho/${record.id}`} variant="secondary">Volver</LinkButton>
          </>
        }
      />
      <p className="text-sm text-[#6c757d]">La informacion se edita desde el modal para mantener separada la lectura de la modificacion.</p>
    </>
  );
}
