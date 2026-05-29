import { Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch } from "@/lib/rbac";
import { createDispatchRecord } from "../actions";
import { DispatchForm } from "../dispatch-form";

export default async function NewDispatchPage() {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const [categories, areas] = await Promise.all([
    prisma.catalogItem.findMany({ where: { type: "dispatch_category", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Nueva atencion de Despacho"
        description="Carga directa de reclamo, consulta, sugerencia, pedido o situacion vecinal."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Despacho", href: "/despacho" }, { label: "Nueva atencion" }]}
        actions={
          <AppModal title="Nueva atencion de Despacho" trigger={<><Plus className="h-4 w-4" />Nueva atencion</>} size="xl">
            <DispatchForm
              action={createDispatchRecord}
              categories={categories.map((item) => ({ value: item.value, label: item.label }))}
              areas={areas.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/despacho"
              modal
              submitLabel="Crear"
            />
          </AppModal>
        }
      />
      <p className="text-sm text-[#6c757d]">Usa el boton Nueva atencion para abrir el formulario de carga.</p>
    </>
  );
}
