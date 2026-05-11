import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { getPeopleProfile, roleLabel } from "@/lib/people-index";
import { assertAccess, canAccessDispatch, canAccessJuridical, canAccessPeople } from "@/lib/rbac";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessPeople(user));
  const { id } = await params;
  const canDispatch = canAccessDispatch(user);
  const canJuridical = canAccessJuridical(user);

  const person = await getPeopleProfile(id, { canDispatch, canJuridical });
  if (!person) notFound();

  const dispatchCases = person.cases.filter((item) => item.module === "DESPACHO");
  const juridicalCases = person.cases.filter((item) => item.module === "JURIDICO");
  const roles = person.roles.filter((role) => role !== "REGISTRO").map(roleLabel).join(" / ") || "Registro";

  return (
    <>
      <PageHeader
        title={person.displayName}
        description="Perfil unificado. Los listados de historial respetan permisos por modulo e indican el rol de la persona en cada caso."
      />

      <div className="space-y-5">
        <DetailSection title="Datos basicos">
          <FieldGrid>
            <DetailField label="DNI" value={person.dni} />
            <DetailField label="Telefono 1" value={person.phone1} />
            <DetailField label="Telefono 2" value={person.phone2} />
            <DetailField label="Domicilio" value={person.address} />
            <DetailField label="Roles" value={roles} />
            <DetailField label="Casos asociados" value={person.caseCount} />
            <DetailField label="Ultimo registro" value={person.updatedAt ? formatDateTime(person.updatedAt) : null} />
          </FieldGrid>
        </DetailSection>

        <DetailSection title="Historial de Despacho">
          {canDispatch ? (
            <Table headers={["Numero", "Fecha", "Categoria", "Estado", "Rol", "Usuario"]} empty={!dispatchCases.length}>
              {dispatchCases.map((record) => (
                <tr key={`${record.module}-${record.id}-${record.role}`}>
                  <Td>
                    <Link href={record.href} className="font-medium text-sky-800 hover:underline">
                      {record.internalNumber}
                    </Link>
                  </Td>
                  <Td>{formatDateTime(record.attendedAt)}</Td>
                  <Td>{labelFromValue(record.kind)}</Td>
                  <Td><StatusBadge value={record.status} /></Td>
                  <Td>{roleLabel(record.role)}</Td>
                  <Td>{record.createdByName}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Historial de Despacho no visible para este rol.</p>
          )}
        </DetailSection>

        <DetailSection title="Historial de Intervenciones">
          {canJuridical ? (
            <Table headers={["Numero", "Fecha", "Tipo", "Estado", "Rol", "Usuario"]} empty={!juridicalCases.length}>
              {juridicalCases.map((intervention) => (
                <tr key={`${intervention.module}-${intervention.id}-${intervention.role}`}>
                  <Td>
                    <Link href={intervention.href} className="font-medium text-sky-800 hover:underline">
                      {intervention.internalNumber}
                    </Link>
                  </Td>
                  <Td>{formatDateTime(intervention.attendedAt)}</Td>
                  <Td>{labelFromValue(intervention.kind)}</Td>
                  <Td><StatusBadge value={intervention.status} /></Td>
                  <Td>{roleLabel(intervention.role)}</Td>
                  <Td>{intervention.createdByName}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Historial de Intervenciones no visible para este rol.</p>
          )}
        </DetailSection>
      </div>
    </>
  );
}
