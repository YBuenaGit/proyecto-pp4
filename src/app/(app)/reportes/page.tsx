import { FilterBar, FilterInput } from "@/components/ui/filter-bar";
import { DetailSection } from "@/components/ui/detail-section";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessExpedients, canAccessJuridical, canAccessReports } from "@/lib/rbac";
import { dateRangeWhere, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";

function CountTable({ title, rows, badgeValues }: { title: string; rows: Array<{ key: string | null; count: number }>; badgeValues?: boolean }) {
  return (
    <DetailSection title={title}>
      <Table headers={["Concepto", "Cantidad"]} empty={!rows.length}>
        {rows.map((row) => {
          const concept = row.key ?? "Sin dato";
          return (
            <tr key={row.key ?? "sin-dato"}>
              <Td>{badgeValues && row.key ? <StatusBadge value={row.key} /> : labelFromValue(concept)}</Td>
              <Td className="whitespace-nowrap">{row.count}</Td>
            </tr>
          );
        })}
      </Table>
    </DetailSection>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessReports(user));
  const params = searchParams ? await searchParams : {};
  const from = param(params, "from");
  const to = param(params, "to");
  const createdAt = dateRangeWhere(from, to);
  const canDispatch = canAccessDispatch(user);
  const canJuridical = canAccessJuridical(user);
  const canExpedients = canAccessExpedients(user);

  const [
    dispatchByCategory,
    dispatchByStatus,
    juridicalByType,
    juridicalByStatus,
    juridicalByUser,
    expedientByStatus,
    expedientByCategory,
  ] = await Promise.all([
    canDispatch
      ? prisma.dispatchRecord.groupBy({ by: ["category"], where: createdAt ? { createdAt } : undefined, _count: true })
      : [],
    canDispatch
      ? prisma.dispatchRecord.groupBy({ by: ["status"], where: createdAt ? { createdAt } : undefined, _count: true })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.groupBy({ by: ["type"], where: createdAt ? { createdAt } : undefined, _count: true })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.groupBy({ by: ["status"], where: createdAt ? { createdAt } : undefined, _count: true })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.groupBy({ by: ["createdById"], where: createdAt ? { createdAt } : undefined, _count: true })
      : [],
    canExpedients
      ? prisma.internalExpedient.groupBy({ by: ["status"], where: createdAt ? { createdAt } : undefined, _count: true })
      : [],
    canExpedients
      ? prisma.internalExpedient.groupBy({ by: ["category"], where: createdAt ? { createdAt } : undefined, _count: true })
      : [],
  ]);

  const users = canJuridical
    ? await prisma.user.findMany({ where: { id: { in: juridicalByUser.map((item) => item.createdById) } } })
    : [];

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Contadores simples por periodo. Para el MVP se priorizan vistas filtrables y exportables manualmente desde tablas."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Reportes" }]}
      />

      <FilterBar resetHref="/reportes">
        <FilterInput label="Desde" name="from" type="date" defaultValue={from} />
        <FilterInput label="Hasta" name="to" type="date" defaultValue={to} />
      </FilterBar>

      <div className="grid gap-5 xl:grid-cols-2">
        {canDispatch ? (
          <>
            <CountTable title="Despacho por categoria" rows={dispatchByCategory.map((item) => ({ key: item.category, count: item._count }))} />
            <CountTable title="Despacho por estado" rows={dispatchByStatus.map((item) => ({ key: item.status, count: item._count }))} badgeValues />
          </>
        ) : null}
        {canJuridical ? (
          <>
            <CountTable title="Intervenciones por tipo" rows={juridicalByType.map((item) => ({ key: item.type, count: item._count }))} />
            <CountTable title="Intervenciones por estado" rows={juridicalByStatus.map((item) => ({ key: item.status, count: item._count }))} badgeValues />
            <CountTable
              title="Intervenciones por usuario"
              rows={juridicalByUser.map((item) => ({
                key: users.find((userItem) => userItem.id === item.createdById)?.name ?? item.createdById,
                count: item._count,
              }))}
            />
          </>
        ) : null}
        {canExpedients ? (
          <>
            <CountTable title="Expedientes por estado" rows={expedientByStatus.map((item) => ({ key: item.status, count: item._count }))} badgeValues />
            <CountTable title="Expedientes por categoria" rows={expedientByCategory.map((item) => ({ key: item.category, count: item._count }))} />
          </>
        ) : null}
      </div>
    </>
  );
}
