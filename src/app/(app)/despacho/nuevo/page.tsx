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
      <PageHeader title="Nueva atencion de Despacho" description="Carga directa de reclamo, consulta, sugerencia, pedido o situacion vecinal." />
      <DispatchForm
        action={createDispatchRecord}
        categories={categories.map((item) => ({ value: item.value, label: item.label }))}
        areas={areas.map((item) => ({ value: item.value, label: item.label }))}
        backHref="/despacho"
      />
    </>
  );
}
