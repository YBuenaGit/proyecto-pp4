import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { DISPATCH_STATUSES, PRIORITIES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, normalizeName, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch } from "@/lib/rbac";
import { dateRangeWhere, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";

export default async function DispatchListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const params = searchParams ? await searchParams : {};

  const from = param(params, "from");
  const to = param(params, "to");
  const category = param(params, "category");
  const status = param(params, "status");
  const priority = param(params, "priority");
  const dni = param(params, "dni");
  const name = param(params, "name");
  const createdById = param(params, "createdById");

  const andFilters: Prisma.DispatchRecordWhereInput[] = [];
  if (dni) {
    andFilters.push({
      OR: [{ dniSnapshot: { contains: dni } }, { person: { dni: { contains: dni } } }],
    });
  }
  if (name) {
    andFilters.push({
      OR: [
        { nameSnapshot: { contains: name } },
        { manualPersonName: { contains: name } },
        { person: { fullNameNormalized: { contains: normalizeName(name) } } },
      ],
    });
  }

  const where: Prisma.DispatchRecordWhereInput = {
    ...(dateRangeWhere(from, to) ? { attendedAt: dateRangeWhere(from, to) } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(createdById ? { createdById } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  };

  const [records, categories, users] = await Promise.all([
    prisma.dispatchRecord.findMany({
      where,
      include: { person: true, createdBy: true, originReferrals: true },
      orderBy: { attendedAt: "desc" },
      take: 100,
    }),
    prisma.catalogItem.findMany({
      where: { type: "dispatch_category", active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({ where: { role: "despacho", active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Despacho · Atenciones / Reclamos"
        description="Registro operativo de reclamos, consultas, sugerencias, pedidos, derivaciones y seguimiento simple."
        actions={
          <LinkButton href="/despacho/nuevo">
            <Plus className="h-4 w-4" />
            Nueva atencion
          </LinkButton>
        }
      />

      <FilterBar resetHref="/despacho">
        <FilterInput label="Desde" name="from" type="date" defaultValue={from} />
        <FilterInput label="Hasta" name="to" type="date" defaultValue={to} />
        <FilterSelect
          label="Categoria"
          name="category"
          defaultValue={category}
          options={categories.map((item) => [item.value, item.label])}
        />
        <FilterSelect label="Estado" name="status" defaultValue={status} options={DISPATCH_STATUSES.map((s) => [s, labelFromValue(s)])} />
        <FilterInput label="DNI" name="dni" defaultValue={dni} />
        <FilterInput label="Nombre y apellido" name="name" defaultValue={name} />
        <FilterSelect
          label="Usuario que atendio"
          name="createdById"
          defaultValue={createdById}
          options={users.map((item) => [item.id, item.name])}
        />
        <FilterSelect label="Prioridad" name="priority" defaultValue={priority} options={PRIORITIES.map((p) => [p, labelFromValue(p)])} />
      </FilterBar>

      <Table headers={["Numero", "Fecha", "Persona", "Categoria", "Prioridad", "Estado", "Atendio"]} empty={!records.length}>
        {records.map((record) => (
          <tr key={record.id}>
            <Td>
              <Link href={`/despacho/${record.id}`} className="font-medium text-sky-800 hover:underline">
                {record.internalNumber}
              </Link>
              {record.originReferrals.length ? (
                <p className="mt-1 text-xs text-slate-500">{record.originReferrals[0].visibleStatusForOrigin}</p>
              ) : null}
            </Td>
            <Td>{formatDateTime(record.attendedAt)}</Td>
            <Td>
              <div className="font-medium text-slate-900">{record.nameSnapshot ?? record.manualPersonName ?? "Sin identificar"}</div>
              <div className="text-xs text-slate-500">{record.dniSnapshot ?? "Sin DNI"}</div>
            </Td>
            <Td>{categories.find((item) => item.value === record.category)?.label ?? labelFromValue(record.category)}</Td>
            <Td><StatusBadge value={record.priority} /></Td>
            <Td><StatusBadge value={record.status} /></Td>
            <Td>{record.createdBy.name}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
