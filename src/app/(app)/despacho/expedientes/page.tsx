import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { EXPEDIENT_AREAS, EXPEDIENT_STATUSES } from "@/lib/constants";
import { CODIGOS_EXPEDIENTES, codigoExpedienteLabel } from "@/lib/constants/codigosExpedientes";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessExpedients } from "@/lib/rbac";
import { dateRangeWhere, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";
import { createExpedient } from "../actions";
import { ExpedientForm } from "./expedient-form";

export default async function ExpedientsListPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const params = searchParams ? await searchParams : {};
  const from = param(params, "from");
  const to = param(params, "to");
  const category = param(params, "category");
  const area = param(params, "area");
  const status = param(params, "status");
  const expedienteNumber = param(params, "expedienteNumber");
  const codigo = param(params, "codigo");

  const where: Prisma.InternalExpedientWhereInput = {
    ...(dateRangeWhere(from, to) ? { createdAt: dateRangeWhere(from, to) } : {}),
    ...(category ? { category } : {}),
    ...(area ? { area } : {}),
    ...(status ? { status } : {}),
    ...(expedienteNumber ? { expedienteNumber: { contains: expedienteNumber } } : {}),
    ...(codigo ? { codigo } : {}),
  };

  const [expedients, categories] = await Promise.all([
    prisma.internalExpedient.findMany({ where, include: { createdBy: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.catalogItem.findMany({ where: { type: "expedient_category", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Despacho · Expedientes internos"
        description="Submodulo administrativo para compras, repuestos, sueldos, alimentos, insumos, mantenimiento y otros expedientes."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Despacho", href: "/despacho" }, { label: "Expedientes internos" }]}
        actions={
          <AppModal title="Nuevo expediente interno" trigger={<><Plus className="h-4 w-4" />Nuevo expediente</>} size="lg">
            <ExpedientForm
              action={createExpedient}
              categories={categories.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/despacho/expedientes"
              modal
              submitLabel="Crear"
            />
          </AppModal>
        }
      />

      <FilterBar resetHref="/despacho/expedientes">
        <FilterInput label="Desde" name="from" type="date" defaultValue={from} />
        <FilterInput label="Hasta" name="to" type="date" defaultValue={to} />
        <FilterSelect label="Categoria" name="category" defaultValue={category} options={categories.map((item) => [item.value, item.label])} />
        <FilterSelect label="Area" name="area" defaultValue={area} options={EXPEDIENT_AREAS.map((item) => [item.value, item.label])} />
        <FilterSelect label="Código" name="codigo" defaultValue={codigo} options={CODIGOS_EXPEDIENTES.map((item) => [item.codigo, `${item.codigo} - ${item.descripcion}`])} />
        <FilterSelect label="Estado" name="status" defaultValue={status} options={EXPEDIENT_STATUSES.map((s) => [s, labelFromValue(s)])} />
        <FilterInput label="Nro expediente" name="expedienteNumber" defaultValue={expedienteNumber} />
      </FilterBar>

      <Table headers={["Numero interno", "Expediente / Código", "Categoria / Area", "Descripcion / Observacion", "Creado / Usuario", "Estado"]} empty={!expedients.length} minWidth={1280}>
        {expedients.map((expedient) => (
          <tr key={expedient.id}>
            <Td>
              <Link href={`/despacho/expedientes/${expedient.id}`} className="whitespace-nowrap font-medium text-[#0667b0] hover:underline">
                {expedient.internalNumber}
              </Link>
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">{expedient.expedienteNumber ?? "-"}</div>
              <div className="mt-1 text-xs text-[#6c757d]">{codigoExpedienteLabel(expedient.codigo)}</div>
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">{categories.find((item) => item.value === expedient.category)?.label ?? labelFromValue(expedient.category)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">Area: {EXPEDIENT_AREAS.find((item) => item.value === expedient.area)?.label ?? labelFromValue(expedient.area)}</div>
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">{expedient.description}</div>
              <div className="mt-1 text-xs leading-5 text-[#6c757d]">{expedient.observation || "-"}</div>
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">{formatDateTime(expedient.createdAt)}</div>
              <div className="text-xs text-[#6c757d]">Usuario: {expedient.createdBy.name}</div>
            </Td>
            <Td><StatusBadge value={expedient.status} /></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
