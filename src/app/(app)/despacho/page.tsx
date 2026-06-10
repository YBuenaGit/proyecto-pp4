import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AppModal } from "@/components/ui/app-modal";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { DISPATCH_STATUSES, PRIORITIES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, normalizeName, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch } from "@/lib/rbac";
import { dateRangeWhere, pagination, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";
import { createDispatchRecord } from "./actions";
import { DispatchForm } from "./dispatch-form";

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
  const { page, pageSize, skip, take } = pagination(params);

  const andFilters: Prisma.DispatchRecordWhereInput[] = [];
  if (dni) {
    andFilters.push({
      OR: [
        { dniSnapshot: { contains: dni } },
        { person: { dni: { contains: dni } } },
        { complainants: { some: { dni: { contains: dni } } } },
        { linkedPersons: { some: { dni: { contains: dni } } } },
      ],
    });
  }
  if (name) {
    andFilters.push({
      OR: [
        { nameSnapshot: { contains: name } },
        { person: { fullNameNormalized: { contains: normalizeName(name) } } },
        { complainants: { some: { firstName: { contains: name } } } },
        { complainants: { some: { lastName: { contains: name } } } },
        { linkedPersons: { some: { firstName: { contains: name } } } },
        { linkedPersons: { some: { apellidoApodoManual: { contains: name } } } },
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

  const [records, totalRecords, categories, users, areas] = await Promise.all([
    prisma.dispatchRecord.findMany({
      where,
      include: {
        person: true,
        createdBy: true,
        originReferrals: true,
        linkedPersons: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { attendedAt: "desc" },
      skip,
      take,
    }),
    prisma.dispatchRecord.count({ where }),
    prisma.catalogItem.findMany({
      where: { type: "dispatch_category", active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({ where: { role: "despacho", active: true }, orderBy: { name: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Despacho · Atenciones / Reclamos"
        description="Registro operativo de reclamos, consultas, sugerencias, pedidos, derivaciones y seguimiento simple."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Despacho" }]}
        actions={
          <AppModal title="Nueva atencion de Despacho" trigger={<><Plus className="h-4 w-4" />Nueva atencion</>} size="xl">
            <DispatchForm
              action={createDispatchRecord}
              categories={categories.map((item) => ({ value: item.value, label: item.label }))}
              areas={areas.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/despacho"
              modal
              submitLabel="Crear"
            />
          </AppModal>
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

      <Table
        title="Atenciones / Reclamos"
        itemLabel="atenciones"
        total={totalRecords}
        page={page}
        pageSize={pageSize}
        headers={["Numero", "Fecha y hora / Reportado por", "Persona", "Categoria", "Prioridad / Estado"]}
        empty={!records.length}
      >
        {records.map((record) => (
          <tr key={record.id}>
            <Td>
              <Link href={`/despacho/${record.id}`} className="whitespace-nowrap font-medium text-[#0667b0] hover:underline">
                {record.internalNumber}
              </Link>
              {record.originReferrals.length ? (
                <p className="mt-1 text-xs text-[#6c757d]">{record.originReferrals[0].visibleStatusForOrigin}</p>
              ) : null}
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">{formatDateTime(record.attendedAt)}</div>
              <div className="text-xs text-[#6c757d]">Reportado por: {record.createdBy.name}</div>
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">
                {record.nameSnapshot ??
                  ([record.linkedPersons[0]?.firstName, record.linkedPersons[0]?.apellidoApodoManual].filter(Boolean).join(" ") ||
                    "Sin identificar")}
              </div>
              <div className="text-xs text-[#6c757d]">{record.dniSnapshot ?? "Sin DNI"}</div>
            </Td>
            <Td>{categories.find((item) => item.value === record.category)?.label ?? labelFromValue(record.category)}</Td>
            <Td>
              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center gap-2">
                  <span className="text-xs text-[#6c757d]">Prioridad:</span>
                  <StatusBadge value={record.priority} />
                </div>
                <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center gap-2">
                  <span className="text-xs text-[#6c757d]">Estado:</span>
                  <StatusBadge value={record.status} />
                </div>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
