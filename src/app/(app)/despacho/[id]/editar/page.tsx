import { notFound } from "next/navigation";
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
    prisma.dispatchRecord.findUnique({ where: { id }, include: { person: true } }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_category", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!record) notFound();

  return (
    <>
      <PageHeader title={`Editar ${record.internalNumber}`} description="Los cambios quedan registrados en auditoria." />
      <DispatchForm
        action={updateDispatchRecord.bind(null, record.id)}
        record={record}
        categories={categories.map((item) => ({ value: item.value, label: item.label }))}
        areas={areas.map((item) => ({ value: item.value, label: item.label }))}
        backHref={`/despacho/${record.id}`}
      />
    </>
  );
}
