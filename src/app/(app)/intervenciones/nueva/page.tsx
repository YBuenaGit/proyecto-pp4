import { Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";
import { createJuridicalIntervention } from "../actions";
import { InterventionForm } from "../intervention-form";

export default async function NewInterventionPage() {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const [types, contexts] = await Promise.all([
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "intervention_context", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Nueva intervencion"
        description="Carga directa del modulo Juridico-Institucional."
        actions={
          <AppModal title="Nueva intervencion" trigger={<><Plus className="h-4 w-4" />Nueva intervencion</>} size="xl">
            <InterventionForm
              action={createJuridicalIntervention}
              types={types.map((item) => ({ value: item.value, label: item.label }))}
              contexts={contexts.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/intervenciones"
              modal
              submitLabel="Crear"
            />
          </AppModal>
        }
      />
      <p className="text-sm text-slate-600">Usa el boton Nueva intervencion para abrir el formulario de carga.</p>
    </>
  );
}
