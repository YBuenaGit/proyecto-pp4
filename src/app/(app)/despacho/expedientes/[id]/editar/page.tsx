import { notFound } from "next/navigation";
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
      <PageHeader title={`Editar ${expedient.internalNumber}`} description="Actualizacion de expediente interno con auditoria." />
      <ExpedientForm
        action={updateExpedient.bind(null, expedient.id)}
        record={expedient}
        categories={categories.map((item) => ({ value: item.value, label: item.label }))}
        backHref={`/despacho/expedientes/${expedient.id}`}
      />
    </>
  );
}
