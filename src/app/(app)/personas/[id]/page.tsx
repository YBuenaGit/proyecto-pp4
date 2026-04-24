import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessJuridical, canAccessPeople } from "@/lib/rbac";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessPeople(user));
  const { id } = await params;
  const canDispatch = canAccessDispatch(user);
  const canJuridical = canAccessJuridical(user);

  const [person, dispatchRecords, interventions] = await Promise.all([
    prisma.externalPerson.findUnique({ where: { id } }),
    canDispatch
      ? prisma.dispatchRecord.findMany({
          where: { personId: id },
          include: { createdBy: true },
          orderBy: { attendedAt: "desc" },
          take: 50,
        })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.findMany({
          where: { personId: id },
          include: { createdBy: true },
          orderBy: { attendedAt: "desc" },
          take: 50,
        })
      : [],
  ]);
  if (!person) notFound();

  return (
    <>
      <PageHeader
        title={`${person.firstName} ${person.lastName}`}
        description="Perfil central compartido. Los listados de historial respetan permisos por modulo."
      />

      <div className="space-y-5">
        <DetailSection title="Datos basicos">
          <FieldGrid>
            <DetailField label="DNI" value={person.dni} />
            <DetailField label="Telefono 1" value={person.phone1} />
            <DetailField label="Telefono 2" value={person.phone2} />
            <DetailField label="Domicilio" value={person.address} />
            <DetailField label="Creado" value={formatDateTime(person.createdAt)} />
            <DetailField label="Actualizado" value={formatDateTime(person.updatedAt)} />
            <DetailField label="Notas" value={person.notes} />
          </FieldGrid>
        </DetailSection>

        <DetailSection title="Historial de Despacho">
          {canDispatch ? (
            <Table headers={["Numero", "Fecha", "Categoria", "Estado", "Usuario"]} empty={!dispatchRecords.length}>
              {dispatchRecords.map((record) => (
                <tr key={record.id}>
                  <Td>
                    <Link href={`/despacho/${record.id}`} className="font-medium text-sky-800 hover:underline">
                      {record.internalNumber}
                    </Link>
                  </Td>
                  <Td>{formatDateTime(record.attendedAt)}</Td>
                  <Td>{labelFromValue(record.category)}</Td>
                  <Td><StatusBadge value={record.status} /></Td>
                  <Td>{record.createdBy.name}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Historial de Despacho no visible para este rol.</p>
          )}
        </DetailSection>

        <DetailSection title="Historial de Intervenciones">
          {canJuridical ? (
            <Table headers={["Numero", "Fecha", "Tipo", "Estado", "Usuario"]} empty={!interventions.length}>
              {interventions.map((intervention) => (
                <tr key={intervention.id}>
                  <Td>
                    <Link href={`/intervenciones/${intervention.id}`} className="font-medium text-sky-800 hover:underline">
                      {intervention.internalNumber}
                    </Link>
                  </Td>
                  <Td>{formatDateTime(intervention.attendedAt)}</Td>
                  <Td>{labelFromValue(intervention.type)}</Td>
                  <Td><StatusBadge value={intervention.status} /></Td>
                  <Td>{intervention.createdBy.name}</Td>
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
