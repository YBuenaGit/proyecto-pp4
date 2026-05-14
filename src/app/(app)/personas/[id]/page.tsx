import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
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
  const newInterventionHref = (role: "complainant" | "linked") => `/intervenciones/nueva?${new URLSearchParams({ personId: person.id, role })}`;

  return (
    <>
      <PageHeader
        title={person.displayName}
        description="Perfil unificado. Los listados de historial respetan permisos por modulo e indican el rol de la persona en cada caso."
        actions={
          canJuridical && person.dni ? (
            <>
              <LinkButton href={newInterventionHref("complainant")} variant="secondary">
                <UserPlus className="h-4 w-4" />
                Nueva como denunciante
              </LinkButton>
              <LinkButton href={newInterventionHref("linked")}>
                <UserPlus className="h-4 w-4" />
                Nueva como denunciada
              </LinkButton>
            </>
          ) : null
        }
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
            <Table headers={["Numero", "Fecha / Usuario", "Categoria", "Estado", "Rol"]} empty={!dispatchCases.length}>
              {dispatchCases.map((record) => (
                <tr key={`${record.module}-${record.id}-${record.role}`}>
                  <Td className="w-[18%]">
                    <Link href={record.href} className="whitespace-nowrap font-medium text-sky-800 hover:underline">
                      {record.internalNumber}
                    </Link>
                  </Td>
                  <Td className="w-[26%]">
                    <div className="font-medium text-slate-900">{formatDateTime(record.attendedAt)}</div>
                    <div className="text-xs text-slate-500">Usuario: {record.createdByName}</div>
                  </Td>
                  <Td className="w-[22%]">{labelFromValue(record.kind)}</Td>
                  <Td className="w-[17%]"><StatusBadge value={record.status} /></Td>
                  <Td className="w-[17%]">{roleLabel(record.role)}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Historial de Despacho no visible para este rol.</p>
          )}
        </DetailSection>

        <DetailSection title="Historial de Intervenciones">
          {canJuridical ? (
            <Table headers={["Numero", "Fecha / Usuario", "Tipo", "Estado", "Rol"]} empty={!juridicalCases.length}>
              {juridicalCases.map((intervention) => (
                <tr key={`${intervention.module}-${intervention.id}-${intervention.role}`}>
                  <Td className="w-[18%]">
                    <Link href={intervention.href} className="whitespace-nowrap font-medium text-sky-800 hover:underline">
                      {intervention.internalNumber}
                    </Link>
                  </Td>
                  <Td className="w-[26%]">
                    <div className="font-medium text-slate-900">{formatDateTime(intervention.attendedAt)}</div>
                    <div className="text-xs text-slate-500">Usuario: {intervention.createdByName}</div>
                  </Td>
                  <Td className="w-[22%]">{labelFromValue(intervention.kind)}</Td>
                  <Td className="w-[17%]"><StatusBadge value={intervention.status} /></Td>
                  <Td className="w-[17%]">{roleLabel(intervention.role)}</Td>
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
