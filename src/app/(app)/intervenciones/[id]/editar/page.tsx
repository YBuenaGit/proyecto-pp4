import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";
import { updateJuridicalIntervention } from "../../actions";
import { InterventionForm } from "../../intervention-form";

export default async function EditInterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const { id } = await params;
  const [intervention, types, contexts] = await Promise.all([
    prisma.juridicalIntervention.findUnique({
      where: { id },
      include: {
        person: true,
        complainants: { orderBy: { sortOrder: "asc" } },
        linkedPersons: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "intervention_context", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!intervention) notFound();

  return (
    <>
      <PageHeader
        title={`Editar ${intervention.internalNumber}`}
        description="Solo pueden modificarse Situación, Personas y Estado. La edición queda auditada."
        breadcrumbs={[{ label: "Anuncios importantes", href: "/" }, { label: "Intervenciones", href: "/intervenciones" }, { label: intervention.internalNumber, href: `/intervenciones/${intervention.id}` }, { label: "Editar" }]}
        actions={
          <>
            <AppModal title={`Editar ${intervention.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar</>} size="xl">
              <InterventionForm
                action={updateJuridicalIntervention.bind(null, intervention.id)}
                record={intervention}
                types={types.map((item) => ({ value: item.value, label: item.label }))}
                contexts={contexts.map((item) => ({ value: item.value, label: item.label }))}
                backHref={`/intervenciones/${intervention.id}`}
                modal
                submitLabel="Guardar cambios"
                mode="general-edit"
              />
            </AppModal>
            <LinkButton href={`/intervenciones/${intervention.id}`} variant="secondary">Volver</LinkButton>
          </>
        }
      />
      <p className="text-sm text-[#212529]">El relato, la orientación, las notas, la derivación y los archivos permanecen inmutables.</p>
    </>
  );
}
