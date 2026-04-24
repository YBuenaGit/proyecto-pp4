import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FilterBar, FilterInput } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDateTime, normalizeName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessJuridical, canAccessPeople } from "@/lib/rbac";
import { param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";

export default async function PeoplePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessPeople(user));
  const canDispatch = canAccessDispatch(user);
  const canJuridical = canAccessJuridical(user);
  const params = searchParams ? await searchParams : {};
  const dni = param(params, "dni");
  const firstName = param(params, "firstName");
  const lastName = param(params, "lastName");
  const name = param(params, "name");

  const where: Prisma.ExternalPersonWhereInput = {
    ...(dni ? { dni: { contains: dni } } : {}),
    ...(firstName ? { firstName: { contains: firstName } } : {}),
    ...(lastName ? { lastName: { contains: lastName } } : {}),
    ...(name ? { fullNameNormalized: { contains: normalizeName(name) } } : {}),
  };

  const people = await prisma.externalPerson.findMany({
    where,
    include: {
      _count: {
        select: {
          dispatchRecords: true,
          juridicalInterventions: true,
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Personas"
        description="Busqueda central por DNI, nombre y apellido. El historial visible depende de los permisos del usuario."
      />

      <FilterBar resetHref="/personas">
        <FilterInput label="DNI" name="dni" defaultValue={dni} />
        <FilterInput label="Nombre" name="firstName" defaultValue={firstName} />
        <FilterInput label="Apellido" name="lastName" defaultValue={lastName} />
        <FilterInput label="Nombre completo" name="name" defaultValue={name} />
      </FilterBar>

      <Table headers={["Persona", "DNI", "Telefono", "Domicilio", "Historial", "Actualizado"]} empty={!people.length}>
        {people.map((person) => (
          <tr key={person.id}>
            <Td>
              <Link href={`/personas/${person.id}`} className="font-medium text-sky-800 hover:underline">
                {person.firstName} {person.lastName}
              </Link>
            </Td>
            <Td>{person.dni ?? "-"}</Td>
            <Td>{person.phone1 ?? "-"}</Td>
            <Td className="whitespace-normal">{person.address ?? "-"}</Td>
            <Td>
              <span className="text-xs text-slate-600">
                Despacho: {canDispatch ? person._count.dispatchRecords : "restringido"} · Intervenciones:{" "}
                {canJuridical ? person._count.juridicalInterventions : "restringido"}
              </span>
            </Td>
            <Td>{formatDateTime(person.updatedAt)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
