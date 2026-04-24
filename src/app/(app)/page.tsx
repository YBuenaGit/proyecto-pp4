import Link from "next/link";
import { Activity, BriefcaseBusiness, ClipboardList, Scale, TimerReset } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { canAccessDispatch, canAccessExpedients, canAccessJuridical, isAdmin, isDirectivo } from "@/lib/rbac";

export default async function DashboardPage() {
  const user = await requireUser();
  const canDispatch = canAccessDispatch(user);
  const canJuridical = canAccessJuridical(user);
  const canExpedients = canAccessExpedients(user);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pendingDispatch, openJuridical, todayDispatchFollowUps, todayJuridicalActions, activeExpedients, auditLogs] =
    await Promise.all([
      canDispatch
        ? prisma.dispatchRecord.count({
            where: { status: { notIn: ["RESUELTO", "CERRADO", "ARCHIVADO"] } },
          })
        : 0,
      canJuridical
        ? prisma.juridicalIntervention.count({
            where: { status: { notIn: ["CONCLUIDO", "ARCHIVADO"] } },
          })
        : 0,
      canDispatch ? prisma.dispatchFollowUp.count({ where: { createdAt: { gte: today } } }) : 0,
      canJuridical ? prisma.juridicalAction.count({ where: { createdAt: { gte: today } } }) : 0,
      canExpedients
        ? prisma.internalExpedient.count({
            where: { status: { notIn: ["FINALIZADO", "ARCHIVADO"] } },
          })
        : 0,
      prisma.auditLog.findMany({
        where:
          isDirectivo(user) || isAdmin(user)
            ? undefined
            : { module: { in: [canDispatch ? "DESPACHO" : "", canJuridical ? "JURIDICO" : ""].filter(Boolean) } },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const [latestDispatch, latestJuridical] = await Promise.all([
    canDispatch
      ? prisma.dispatchRecord.findMany({
          include: { person: true, createdBy: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
    canJuridical
      ? prisma.juridicalIntervention.findMany({
          include: { person: true, createdBy: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
  ]);

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Panel operativo con indicadores del dia, actividad reciente y accesos a los ultimos registros disponibles segun el rol."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Reclamos pendientes" value={pendingDispatch} icon={<ClipboardList className="h-5 w-5" />} />
        <KpiCard label="Intervenciones abiertas" value={openJuridical} icon={<Scale className="h-5 w-5" />} />
        <KpiCard
          label="Seguimientos de hoy"
          value={todayDispatchFollowUps + todayJuridicalActions}
          icon={<TimerReset className="h-5 w-5" />}
        />
        <KpiCard label="Expedientes activos" value={activeExpedients} icon={<BriefcaseBusiness className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-700" />
            <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
          </div>
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">{log.module} · {log.action}</p>
                  <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{log.createdBy?.name ?? "Sistema"}</p>
              </div>
            ))}
            {!auditLogs.length ? <p className="text-sm text-slate-500">Sin actividad visible.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Resumen por modulo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Despacho</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingDispatch}</p>
              <p className="text-xs text-slate-500">Pendientes o en gestion</p>
            </div>
            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Intervenciones</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{openJuridical}</p>
              <p className="text-xs text-slate-500">Abiertas o en seguimiento</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {canDispatch ? (
          <Table headers={["Ultimas atenciones", "Persona", "Estado", "Fecha"]} empty={!latestDispatch.length}>
            {latestDispatch.map((record) => (
              <tr key={record.id}>
                <Td>
                  <Link href={`/despacho/${record.id}`} className="font-medium text-sky-800 hover:underline">
                    {record.internalNumber}
                  </Link>
                </Td>
                <Td>{record.nameSnapshot ?? record.manualPersonName ?? "Sin identificar"}</Td>
                <Td><StatusBadge value={record.status} /></Td>
                <Td>{formatDateTime(record.attendedAt)}</Td>
              </tr>
            ))}
          </Table>
        ) : null}
        {canJuridical ? (
          <Table headers={["Ultimas intervenciones", "Persona", "Estado", "Fecha"]} empty={!latestJuridical.length}>
            {latestJuridical.map((intervention) => (
              <tr key={intervention.id}>
                <Td>
                  <Link href={`/intervenciones/${intervention.id}`} className="font-medium text-sky-800 hover:underline">
                    {intervention.internalNumber}
                  </Link>
                </Td>
                <Td>{intervention.nameSnapshot ?? intervention.manualPersonName ?? "Sin identificar"}</Td>
                <Td><StatusBadge value={intervention.status} /></Td>
                <Td>{formatDateTime(intervention.attendedAt)}</Td>
              </tr>
            ))}
          </Table>
        ) : null}
      </div>
    </>
  );
}
