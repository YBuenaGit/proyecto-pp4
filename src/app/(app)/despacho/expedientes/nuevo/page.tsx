import { Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessExpedients } from "@/lib/rbac";
import { createExpedient } from "../../actions";
import { ExpedientForm } from "../expedient-form";

export default async function NewExpedientPage() {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const categories = await prisma.catalogItem.findMany({ where: { type: "expedient_category", active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <>
      <PageHeader
        title="Nuevo expediente interno"
        description="Carga administrativa interna de Despacho."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Despacho", href: "/despacho" }, { label: "Expedientes internos", href: "/despacho/expedientes" }, { label: "Nuevo" }]}
        actions={
          <AppModal title="Nuevo expediente interno" trigger={<><Plus className="h-4 w-4" />Nuevo expediente</>} size="lg">
            <ExpedientForm
              action={createExpedient}
              categories={categories.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/despacho/expedientes"
              modal
              submitLabel="Crear"
            />
          </AppModal>
        }
      />
      <p className="text-sm text-[#6c757d]">Usa el boton Nuevo expediente para abrir el formulario de carga.</p>
    </>
  );
}
