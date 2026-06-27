import Link from "next/link";
import { FilterBar, FilterInput } from "@/components/ui/filter-bar";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getPeopleIndex, roleLabel } from "@/lib/people-index";
import { assertAccess, canAccessDispatch, canAccessJuridical, canAccessPeople } from "@/lib/rbac";
import { pagination, param } from "@/lib/search";
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
  const caseQuery = param(params, "case");
  const { page, pageSize, skip, take } = pagination(params);

  const allPeople = await getPeopleIndex({
    permissions: { canDispatch, canJuridical },
    filters: { dni, firstName, lastName, name, caseQuery },
  });
  const people = allPeople.slice(skip, skip + take);

  return (
    <>
      <PageHeader
        title="Personas"
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Personas" }]}
      />

      <ListToolbar>
        <FilterBar resetHref="/personas" label="Buscar persona" modal>
          <FilterInput label="DNI" name="dni" defaultValue={dni} />
          <FilterInput label="Apellido" name="lastName" defaultValue={lastName} />
          <FilterInput label="Nombre" name="firstName" defaultValue={firstName} />
          <FilterInput label="Apellido y nombre" name="name" defaultValue={name} />
          <FilterInput label="Caso" name="case" defaultValue={caseQuery} />
        </FilterBar>
      </ListToolbar>

      <Table
        title="Personas"
        itemLabel="personas"
        total={allPeople.length}
        page={page}
        pageSize={pageSize}
        headers={["Persona / DNI", "Contacto", "Domicilio", "Roles", "Casos / Ultimo caso"]}
        empty={!people.length}
      >
        {people.map((person) => (
          <tr key={person.id}>
            <Td>
              <Link href={`/personas/${person.id}`} className="font-medium text-[#0667b0] hover:underline">
                {person.displayName}
              </Link>
              <div className="text-xs text-[#6c757d]">{person.dni ?? "Sin DNI"}</div>
            </Td>
            <Td>{[person.phone1, person.phone2].filter(Boolean).join(" / ") || "-"}</Td>
            <Td>{person.address ?? "-"}</Td>
            <Td>
              {person.roles.filter((role) => role !== "REGISTRO").map(roleLabel).join(" / ") || "Registro"}
            </Td>
            <Td>
              <div className="font-medium text-[#212529]">{person.caseCount} casos</div>
              {person.latestCase ? (
                <div className="mt-1">
                  <Link href={person.latestCase.href} className="whitespace-nowrap font-medium text-[#0667b0] hover:underline">
                    {person.latestCase.internalNumber}
                  </Link>
                  <div className="text-xs text-[#6c757d]">{formatDateTime(person.latestCase.attendedAt)}</div>
                </div>
              ) : (
                "-"
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
