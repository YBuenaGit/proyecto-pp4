import { notFound } from "next/navigation";
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
    prisma.juridicalIntervention.findUnique({ where: { id }, include: { person: true } }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "intervention_context", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!intervention) notFound();

  return (
    <>
      <PageHeader title={`Editar ${intervention.internalNumber}`} description="La edicion queda auditada con usuario, fecha y estado." />
      <InterventionForm
        action={updateJuridicalIntervention.bind(null, intervention.id)}
        record={intervention}
        types={types.map((item) => ({ value: item.value, label: item.label }))}
        contexts={contexts.map((item) => ({ value: item.value, label: item.label }))}
        backHref={`/intervenciones/${intervention.id}`}
      />
    </>
  );
}
