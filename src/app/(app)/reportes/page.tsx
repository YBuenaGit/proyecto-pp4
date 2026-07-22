import { CalendarRange, RefreshCw } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button, LinkButton } from "@/components/ui/button";
import { FormField, inputClass } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getMonthRange } from "@/lib/agenda-dates";
import { toArgentinaMonthKey } from "@/lib/argentina-time";
import { labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessExpedients, canAccessJuridical, canAccessReports } from "@/lib/rbac";
import { dateRangeWhere, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";

function currentMonthRange() {
  const { monthStart, monthEnd } = getMonthRange(toArgentinaMonthKey());
  return { from: monthStart, to: monthEnd };
}

function reportRangeLabel(from: string, to: string) {
  return `Desde ${formatDateKey(from)} hasta ${formatDateKey(to)}`;
}

function formatDateKey(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function CountTable({ title, rows, badgeValues }: { title: string; rows: Array<{ key: string | null; count: number }>; badgeValues?: boolean }) {
  return (
    <Table title={title} itemLabel="conceptos" total={rows.length} showPagination={false} headers={["Concepto", "Cantidad"]} empty={!rows.length}>
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
  );
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessReports(user));
  const params = searchParams ? await searchParams : {};
  const currentRange = currentMonthRange();
  const from = param(params, "from") ?? currentRange.from;
  const to = param(params, "to") ?? currentRange.to;
  const reportRange = dateRangeWhere(from, to);
  const currentMonthHref = `/reportes?from=${currentRange.from}&to=${currentRange.to}`;
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
      ? prisma.dispatchRecord.groupBy({ by: ["category"], where: reportRange ? { attendedAt: reportRange } : undefined, _count: true })
      : [],
    canDispatch
      ? prisma.dispatchRecord.groupBy({ by: ["status"], where: reportRange ? { attendedAt: reportRange } : undefined, _count: true })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.groupBy({ by: ["type"], where: reportRange ? { attendedAt: reportRange } : undefined, _count: true })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.groupBy({ by: ["status"], where: reportRange ? { attendedAt: reportRange } : undefined, _count: true })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.groupBy({ by: ["createdById"], where: reportRange ? { attendedAt: reportRange } : undefined, _count: true })
      : [],
    canExpedients
      ? prisma.internalExpedient.groupBy({ by: ["status"], where: reportRange ? { createdAt: reportRange } : undefined, _count: true })
      : [],
    canExpedients
      ? prisma.internalExpedient.groupBy({ by: ["category"], where: reportRange ? { createdAt: reportRange } : undefined, _count: true })
      : [],
  ]);

  const users = canJuridical
    ? await prisma.user.findMany({ where: { id: { in: juridicalByUser.map((item) => item.createdById) } } })
    : [];

  return (
    <>
      <PageHeader
        title="Reportes"
        breadcrumbs={[{ label: "Anuncios importantes", href: "/" }, { label: "Reportes" }]}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-sm border border-[#c7d2de] bg-white px-3 py-2 text-sm font-semibold text-[#263544] shadow-sm">
          {reportRangeLabel(from, to)}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <LinkButton href={currentMonthHref} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Mes actual
          </LinkButton>
          <AppModal title="Filtrar reporte" trigger={<><CalendarRange className="h-4 w-4" />Filtrar reporte</>} size="md">
            <form action="/reportes" method="get" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Desde">
                  <input className={inputClass} type="date" name="from" defaultValue={from} />
                </FormField>
                <FormField label="Hasta">
                  <input className={inputClass} type="date" name="to" defaultValue={to} />
                </FormField>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-[#dee2e6] pt-3">
                <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                <Button type="submit">
                  <CalendarRange className="h-4 w-4" />
                  Filtrar reporte
                </Button>
              </div>
            </form>
          </AppModal>
        </div>
      </div>

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
