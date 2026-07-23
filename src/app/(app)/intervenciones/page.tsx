import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import {
  JURIDICAL_DERIVED_AREAS,
  JURIDICAL_STATUSES,
  PRIORITIES,
} from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";
import { dateRangeWhere, pagination, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";
import { personDisplayName } from "@/lib/text";
import { createJuridicalIntervention } from "./actions";
import { InterventionForm } from "./intervention-form";

export default async function InterventionsListPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const params = searchParams ? await searchParams : {};
  const from = param(params, "from");
  const to = param(params, "to");
  const type = param(params, "type");
  const status = param(params, "status");
  const urgency = param(params, "urgency");
  const derivedArea = param(params, "derivedArea");
  const dni = param(params, "dni");
  const apellido = param(params, "apellido");
  const nombre = param(params, "nombre");
  const oficioNumber = param(params, "oficioNumber");
  const expedienteNumber = param(params, "expedienteNumber");
  const createdById = param(params, "createdById");
  const { page, pageSize, skip, take } = pagination(params);

  const andFilters: Prisma.JuridicalInterventionWhereInput[] = [];
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
  if (apellido) {
    andFilters.push({
      OR: [
        { nameSnapshot: { contains: apellido, mode: "insensitive" } },
        { person: { lastName: { contains: apellido, mode: "insensitive" } } },
        { complainants: { some: { lastName: { contains: apellido, mode: "insensitive" } } } },
        { linkedPersons: { some: { apellidoApodoManual: { contains: apellido, mode: "insensitive" } } } },
      ],
    });
  }
  if (nombre) {
    andFilters.push({
      OR: [
        { nameSnapshot: { contains: nombre, mode: "insensitive" } },
        { person: { firstName: { contains: nombre, mode: "insensitive" } } },
        { complainants: { some: { firstName: { contains: nombre, mode: "insensitive" } } } },
        { linkedPersons: { some: { firstName: { contains: nombre, mode: "insensitive" } } } },
      ],
    });
  }

  const where: Prisma.JuridicalInterventionWhereInput = {
    ...(dateRangeWhere(from, to) ? { attendedAt: dateRangeWhere(from, to) } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(urgency ? { urgency } : {}),
    ...(derivedArea ? { derivedArea } : {}),
    ...(oficioNumber ? { oficioNumber: { contains: oficioNumber, mode: "insensitive" } } : {}),
    ...(expedienteNumber ? { expedienteNumber: { contains: expedienteNumber, mode: "insensitive" } } : {}),
    ...(createdById ? { createdById } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  };

  const [interventions, totalInterventions, types, users, contexts] = await Promise.all([
    prisma.juridicalIntervention.findMany({
      where,
      include: {
        person: true,
        createdBy: true,
        destinationReferrals: true,
        linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: { attendedAt: "desc" },
      skip,
      take,
    }),
    prisma.juridicalIntervention.count({ where }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { role: "juridico", active: true }, orderBy: { name: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "intervention_context", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Intervenciones Juridico-Institucionales"
        breadcrumbs={[{ label: "Anuncios importantes", href: "/" }, { label: "Intervenciones" }]}
      />

      <ListToolbar
        actions={
          <AppModal title="Nueva intervencion" trigger={<><Plus className="h-4 w-4" />Nueva intervencion</>} size="xl">
            <InterventionForm
              action={createJuridicalIntervention}
              types={types.map((item) => ({ value: item.value, label: item.label }))}
              contexts={contexts.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/intervenciones"
              modal
              submitLabel="Crear"
            />
          </AppModal>
        }
      >
        <FilterBar resetHref="/intervenciones" label="Buscar intervencion">
          <FilterInput label="Desde" name="from" type="date" defaultValue={from} />
          <FilterInput label="Hasta" name="to" type="date" defaultValue={to} />
          <FilterSelect label="Tipo" name="type" defaultValue={type} options={types.map((item) => [item.value, item.label])} />
          <FilterSelect label="Estado" name="status" defaultValue={status} options={JURIDICAL_STATUSES.map((s) => [s, labelFromValue(s)])} />
          <FilterSelect label="Urgencia" name="urgency" defaultValue={urgency} options={PRIORITIES.map((p) => [p, labelFromValue(p)])} />
          <FilterSelect
            label="Area derivada"
            name="derivedArea"
            defaultValue={derivedArea}
            options={JURIDICAL_DERIVED_AREAS.map((area) => [area, area])}
          />
          <FilterInput label="DNI" name="dni" defaultValue={dni} />
          <FilterInput label="Apellido" name="apellido" defaultValue={apellido} />
          <FilterInput label="Nombre" name="nombre" defaultValue={nombre} />
          <FilterInput label="Oficio" name="oficioNumber" defaultValue={oficioNumber} />
          <FilterInput label="Expediente" name="expedienteNumber" defaultValue={expedienteNumber} />
          <FilterSelect label="Usuario" name="createdById" defaultValue={createdById} options={users.map((item) => [item.id, item.name])} />
        </FilterBar>
      </ListToolbar>

      <Table
        title="Intervenciones"
        itemLabel="intervenciones"
        total={totalInterventions}
        page={page}
        pageSize={pageSize}
        headers={["Numero", "Fecha y hora / Reportado por", "Persona", "Tipo", "Urgencia / Estado"]}
        empty={!interventions.length}
      >
        {interventions.map((intervention) => (
          <tr key={intervention.id}>
            <Td>
              <Link href={`/intervenciones/${intervention.id}`} className="whitespace-nowrap font-medium text-[#0667b0] hover:underline">
                {intervention.internalNumber}
              </Link>
              {intervention.origin === "FROM_DESPACHO" ? <p className="mt-1 text-xs text-[#212529]">Derivada desde Despacho</p> : null}
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">{formatDateTime(intervention.attendedAt)}</div>
              <div className="text-xs text-[#212529]">Reportado por: {intervention.createdBy.name}</div>
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">
                {personDisplayName(intervention.linkedPersons[0]?.apellidoApodoManual, intervention.linkedPersons[0]?.firstName) || intervention.nameSnapshot || "Sin identificar"}
              </div>
              <div className="text-xs text-[#212529]">{intervention.dniSnapshot ?? "Sin DNI"}</div>
            </Td>
            <Td>{types.find((item) => item.value === intervention.type)?.label ?? labelFromValue(intervention.type)}</Td>
            <Td>
              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center gap-2">
                  <span className="text-xs text-[#212529]">Urgencia:</span>
                  <StatusBadge value={intervention.urgency} />
                </div>
                <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center gap-2">
                  <span className="text-xs text-[#212529]">Estado:</span>
                  <StatusBadge value={intervention.status} />
                </div>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
