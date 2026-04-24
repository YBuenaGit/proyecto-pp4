import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { JURIDICAL_STATUSES, PRIORITIES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue, normalizeName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";
import { dateRangeWhere, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";

export default async function InterventionsListPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const params = searchParams ? await searchParams : {};
  const from = param(params, "from");
  const to = param(params, "to");
  const type = param(params, "type");
  const status = param(params, "status");
  const urgency = param(params, "urgency");
  const dni = param(params, "dni");
  const name = param(params, "name");
  const oficioNumber = param(params, "oficioNumber");
  const expedienteNumber = param(params, "expedienteNumber");
  const createdById = param(params, "createdById");

  const andFilters: Prisma.JuridicalInterventionWhereInput[] = [];
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

  const where: Prisma.JuridicalInterventionWhereInput = {
    ...(dateRangeWhere(from, to) ? { attendedAt: dateRangeWhere(from, to) } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(urgency ? { urgency } : {}),
    ...(oficioNumber ? { oficioNumber: { contains: oficioNumber } } : {}),
    ...(expedienteNumber ? { expedienteNumber: { contains: expedienteNumber } } : {}),
    ...(createdById ? { createdById } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  };

  const [interventions, types, users] = await Promise.all([
    prisma.juridicalIntervention.findMany({
      where,
      include: { person: true, createdBy: true, destinationReferrals: true },
      orderBy: { attendedAt: "desc" },
      take: 100,
    }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { role: "juridico", active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Intervenciones Juridico-Institucionales"
        description="Registro amplio de orientaciones, contencion, informes, oficios, actuaciones y conflictos vecinales."
        actions={<LinkButton href="/intervenciones/nueva"><Plus className="h-4 w-4" />Nueva intervencion</LinkButton>}
      />

      <FilterBar resetHref="/intervenciones">
        <FilterInput label="Desde" name="from" type="date" defaultValue={from} />
        <FilterInput label="Hasta" name="to" type="date" defaultValue={to} />
        <FilterSelect label="Tipo" name="type" defaultValue={type} options={types.map((item) => [item.value, item.label])} />
        <FilterSelect label="Estado" name="status" defaultValue={status} options={JURIDICAL_STATUSES.map((s) => [s, labelFromValue(s)])} />
        <FilterSelect label="Urgencia" name="urgency" defaultValue={urgency} options={PRIORITIES.map((p) => [p, labelFromValue(p)])} />
        <FilterInput label="DNI" name="dni" defaultValue={dni} />
        <FilterInput label="Nombre y apellido" name="name" defaultValue={name} />
        <FilterInput label="Oficio" name="oficioNumber" defaultValue={oficioNumber} />
        <FilterInput label="Expediente" name="expedienteNumber" defaultValue={expedienteNumber} />
        <FilterSelect label="Usuario" name="createdById" defaultValue={createdById} options={users.map((item) => [item.id, item.name])} />
      </FilterBar>

      <Table headers={["Numero", "Fecha", "Persona", "Tipo", "Urgencia", "Estado", "Atendio"]} empty={!interventions.length}>
        {interventions.map((intervention) => (
          <tr key={intervention.id}>
            <Td>
              <Link href={`/intervenciones/${intervention.id}`} className="font-medium text-sky-800 hover:underline">
                {intervention.internalNumber}
              </Link>
              {intervention.origin === "FROM_DESPACHO" ? <p className="mt-1 text-xs text-slate-500">Derivada desde Despacho</p> : null}
            </Td>
            <Td>{formatDateTime(intervention.attendedAt)}</Td>
            <Td>
              <div className="font-medium text-slate-900">{intervention.nameSnapshot ?? intervention.manualPersonName ?? "Sin identificar"}</div>
              <div className="text-xs text-slate-500">{intervention.dniSnapshot ?? "Sin DNI"}</div>
            </Td>
            <Td>{types.find((item) => item.value === intervention.type)?.label ?? labelFromValue(intervention.type)}</Td>
            <Td><StatusBadge value={intervention.urgency} /></Td>
            <Td><StatusBadge value={intervention.status} /></Td>
            <Td>{intervention.createdBy.name}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
