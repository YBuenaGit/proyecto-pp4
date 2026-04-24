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
      <PageHeader title="Nuevo expediente interno" description="Carga administrativa interna de Despacho." />
      <ExpedientForm action={createExpedient} categories={categories.map((item) => ({ value: item.value, label: item.label }))} backHref="/despacho/expedientes" />
    </>
  );
}
