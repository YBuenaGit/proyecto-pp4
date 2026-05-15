import Link from "next/link";
import { BriefcaseBusiness, ClipboardList, Eye, Scale, TimerReset } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import {
  DISPATCH_CATEGORY_LABELS,
  EXPEDIENT_CATEGORY_LABELS,
  JURIDICAL_TYPE_LABELS,
} from "@/lib/constants";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { canAccessDispatch, canAccessExpedients, canAccessJuridical, isAdmin, isDirectivo } from "@/lib/rbac";
import { param } from "@/lib/search";
import { placeholders, sqliteQuery, sqliteQueryOne, type SqliteParam } from "@/lib/sqlite";
import type { SearchParams } from "@/lib/types";

const pendingDispatchStatuses = ["RECIBIDO", "EN_ANALISIS", "EN_GESTION"];
const openJuridicalStatuses = ["RECIBIDO", "EN_ORIENTACION", "PENDIENTE_DOCUMENTACION", "EN_SEGUIMIENTO"];
const activeExpedientStatuses = ["INICIADO", "EN_TRAMITE", "OBSERVADO", "EN_APROBACION", "APROBADO"];

type DashboardPanel = "dispatch" | "juridical" | "followups" | "expedients";

type DashboardRow = {
  id: string;
  number: string;
  href: string;
  dateTime: Date | string;
  reportedBy: string;
  requester: string;
  category: string;
  priority: string;
  status: string;
};

type CountRow = {
  count: number;
};

type DispatchDashboardRow = {
  id: string;
  internalNumber: string;
  attendedAt: number | string;
  nameSnapshot: string | null;
  category: string;
  priority: string;
  status: string;
  createdByName: string | null;
};

type JuridicalDashboardRow = {
  id: string;
  internalNumber: string;
  attendedAt: number | string;
  nameSnapshot: string | null;
  type: string;
  urgency: string;
  status: string;
  createdByName: string | null;
};

type FollowUpDashboardRow = {
  id: string;
  juridicalInterventionId: string;
  nextStepDate: number | string | null;
  createdAt: number | string;
  actionType: string;
  createdByName: string | null;
  internalNumber: string;
  nameSnapshot: string | null;
  urgency: string;
  status: string;
};

type ExpedientDashboardRow = {
  id: string;
  internalNumber: string;
  expedienteNumber: string | null;
  createdAt: number | string;
  description: string;
  category: string;
  status: string;
  createdByName: string | null;
};

const panelCopy: Record<DashboardPanel, { title: string; description: string; empty: string }> = {
  dispatch: {
    title: "Tabla de reclamos pendientes",
    description: "Reclamos recibidos, en análisis o en gestión que todavía requieren tratamiento.",
    empty: "No hay reclamos pendientes para mostrar.",
  },
  juridical: {
    title: "Tabla de intervenciones abiertas",
    description: "Intervenciones jurídico-institucionales abiertas, en orientación o seguimiento.",
    empty: "No hay intervenciones abiertas para mostrar.",
  },
  followups: {
    title: "Tabla de seguimientos de hoy",
    description: "Acciones programadas para hoy sobre registros activos y visibles para el rol.",
    empty: "No hay seguimientos programados para hoy.",
  },
  expedients: {
    title: "Tabla de expedientes activos",
    description: "Expedientes internos iniciados o en trámite administrativo.",
    empty: "No hay expedientes activos para mostrar.",
  },
};

function dashboardHref(panel: DashboardPanel) {
  return `/?panel=${panel}`;
}

function normalizePanel(value: string | undefined, availablePanels: DashboardPanel[], fallback: DashboardPanel) {
  return availablePanels.includes(value as DashboardPanel) ? (value as DashboardPanel) : fallback;
}

function truncate(value: string | null | undefined, max = 86) {
  if (!value) return "Sin datos";
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function requesterFrom(record: { nameSnapshot?: string | null }) {
  return record.nameSnapshot ?? "Sin datos";
}

function categoryLabel(labels: Record<string, string>, value: string | null | undefined) {
  if (!value) return "Sin datos";
  return labels[value] ?? labelFromValue(value);
}

function sqliteDate(value: number | string | null | undefined) {
  if (!value) return new Date(0);
  return typeof value === "number" ? new Date(value) : value;
}

function reportedBy(value: string | null | undefined) {
  return value ?? "Sin datos";
}

function defaultPanel(availablePanels: DashboardPanel[]) {
  return availablePanels[0] ?? "dispatch";
}

async function countByStatuses(table: "DispatchRecord" | "JuridicalIntervention" | "InternalExpedient", statuses: string[]) {
  const row = await sqliteQueryOne<CountRow>(
    `SELECT COUNT(*) AS count
     FROM ${table}
     WHERE status IN (${placeholders(statuses)})`,
    statuses,
  );
  return row?.count ?? 0;
}

async function countTodayJuridicalActions(today: Date, tomorrow: Date) {
  const row = await sqliteQueryOne<CountRow>(
    `SELECT COUNT(*) AS count
     FROM JuridicalAction action
     INNER JOIN JuridicalIntervention intervention ON intervention.id = action.juridicalInterventionId
     WHERE action.nextStepDate >= ?
       AND action.nextStepDate < ?
       AND intervention.status IN (${placeholders(openJuridicalStatuses)})`,
    [today.getTime(), tomorrow.getTime(), ...openJuridicalStatuses],
  );
  return row?.count ?? 0;
}

async function getRowsForPanel({
  panel,
  canDashboardDispatch,
  canDashboardJuridical,
  canDashboardExpedients,
  today,
  tomorrow,
}: {
  panel: DashboardPanel;
  canDashboardDispatch: boolean;
  canDashboardJuridical: boolean;
  canDashboardExpedients: boolean;
  today: Date;
  tomorrow: Date;
}): Promise<DashboardRow[]> {
  if (panel === "dispatch" && canDashboardDispatch) {
    const records = await sqliteQuery<DispatchDashboardRow>(
      `SELECT
         record.id,
         record.internalNumber,
         record.attendedAt,
         record.nameSnapshot,
         record.category,
         record.priority,
         record.status,
         user.name AS createdByName
       FROM DispatchRecord record
       LEFT JOIN User user ON user.id = record.createdById
       WHERE record.status IN (${placeholders(pendingDispatchStatuses)})
       ORDER BY
         CASE record.priority
           WHEN 'URGENTE' THEN 4
           WHEN 'ALTA' THEN 3
           WHEN 'MEDIA' THEN 2
           WHEN 'BAJA' THEN 1
           ELSE 0
         END DESC,
         record.attendedAt DESC
       LIMIT 10`,
      pendingDispatchStatuses,
    );

    return records.map((record) => ({
      id: record.id,
      number: record.internalNumber,
      href: `/despacho/${record.id}`,
      dateTime: sqliteDate(record.attendedAt),
      reportedBy: reportedBy(record.createdByName),
      requester: requesterFrom(record),
      category: categoryLabel(DISPATCH_CATEGORY_LABELS, record.category),
      priority: record.priority,
      status: record.status,
    }));
  }

  if (panel === "juridical" && canDashboardJuridical) {
    const interventions = await sqliteQuery<JuridicalDashboardRow>(
      `SELECT
         intervention.id,
         intervention.internalNumber,
         intervention.attendedAt,
         intervention.nameSnapshot,
         intervention.type,
         intervention.urgency,
         intervention.status,
         user.name AS createdByName
       FROM JuridicalIntervention intervention
       LEFT JOIN User user ON user.id = intervention.createdById
       WHERE intervention.status IN (${placeholders(openJuridicalStatuses)})
       ORDER BY
         CASE intervention.urgency
           WHEN 'URGENTE' THEN 4
           WHEN 'ALTA' THEN 3
           WHEN 'MEDIA' THEN 2
           WHEN 'BAJA' THEN 1
           ELSE 0
         END DESC,
         intervention.attendedAt DESC
       LIMIT 10`,
      openJuridicalStatuses,
    );

    return interventions.map((intervention) => ({
      id: intervention.id,
      number: intervention.internalNumber,
      href: `/intervenciones/${intervention.id}`,
      dateTime: sqliteDate(intervention.attendedAt),
      reportedBy: reportedBy(intervention.createdByName),
      requester: requesterFrom(intervention),
      category: categoryLabel(JURIDICAL_TYPE_LABELS, intervention.type),
      priority: intervention.urgency,
      status: intervention.status,
    }));
  }

  if (panel === "followups" && canDashboardJuridical) {
    const params: SqliteParam[] = [today.getTime(), tomorrow.getTime(), ...openJuridicalStatuses];
    const actions = await sqliteQuery<FollowUpDashboardRow>(
      `SELECT
         action.id,
         action.juridicalInterventionId,
         action.nextStepDate,
         action.createdAt,
         action.actionType,
         user.name AS createdByName,
         intervention.internalNumber,
         intervention.nameSnapshot,
         intervention.urgency,
         intervention.status
       FROM JuridicalAction action
       INNER JOIN JuridicalIntervention intervention ON intervention.id = action.juridicalInterventionId
       LEFT JOIN User user ON user.id = action.createdById
       WHERE action.nextStepDate >= ?
         AND action.nextStepDate < ?
         AND intervention.status IN (${placeholders(openJuridicalStatuses)})
       ORDER BY action.nextStepDate ASC, action.createdAt DESC
       LIMIT 10`,
      params,
    );

    return actions.map((action) => ({
      id: action.id,
      number: action.internalNumber,
      href: `/intervenciones/${action.juridicalInterventionId}`,
      dateTime: sqliteDate(action.nextStepDate ?? action.createdAt),
      reportedBy: reportedBy(action.createdByName),
      requester: requesterFrom(action),
      category: `Intervenciones · ${labelFromValue(action.actionType)}`,
      priority: action.urgency,
      status: action.status,
    }));
  }

  if (panel === "expedients" && canDashboardExpedients) {
    const expedients = await sqliteQuery<ExpedientDashboardRow>(
      `SELECT
         expedient.id,
         expedient.internalNumber,
         expedient.expedienteNumber,
         expedient.createdAt,
         expedient.description,
         expedient.category,
         expedient.status,
         user.name AS createdByName
       FROM InternalExpedient expedient
       LEFT JOIN User user ON user.id = expedient.createdById
       WHERE expedient.status IN (${placeholders(activeExpedientStatuses)})
       ORDER BY expedient.createdAt DESC
       LIMIT 10`,
      activeExpedientStatuses,
    );

    return expedients.map((expedient) => ({
      id: expedient.id,
      number: expedient.expedienteNumber ?? expedient.internalNumber,
      href: `/despacho/expedientes/${expedient.id}`,
      dateTime: sqliteDate(expedient.createdAt),
      reportedBy: reportedBy(expedient.createdByName),
      requester: truncate(expedient.description),
      category: categoryLabel(EXPEDIENT_CATEGORY_LABELS, expedient.category),
      priority: "NO_APLICA",
      status: expedient.status,
    }));
  }

  return [];
}

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};

  const hasDashboardOverview = isDirectivo(user) || isAdmin(user);
  const canDashboardDispatch = canAccessDispatch(user) || hasDashboardOverview;
  const canDashboardJuridical = canAccessJuridical(user) || hasDashboardOverview;
  const canDashboardExpedients = canAccessExpedients(user) || hasDashboardOverview;
  const canDashboardFollowUps = canDashboardDispatch || canDashboardJuridical || canDashboardExpedients;

  const availablePanels: DashboardPanel[] = [
    ...(canDashboardDispatch ? (["dispatch"] as const) : []),
    ...(canDashboardJuridical ? (["juridical"] as const) : []),
    ...(canDashboardFollowUps ? (["followups"] as const) : []),
    ...(canDashboardExpedients ? (["expedients"] as const) : []),
  ];

  const selectedPanel = normalizePanel(param(params, "panel"), availablePanels, defaultPanel(availablePanels));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [pendingDispatch, openJuridical, todayJuridicalActions, activeExpedients, rows] = await Promise.all([
    canDashboardDispatch
      ? countByStatuses("DispatchRecord", pendingDispatchStatuses)
      : 0,
    canDashboardJuridical
      ? countByStatuses("JuridicalIntervention", openJuridicalStatuses)
      : 0,
    canDashboardJuridical
      ? countTodayJuridicalActions(today, tomorrow)
      : 0,
    canDashboardExpedients
      ? countByStatuses("InternalExpedient", activeExpedientStatuses)
      : 0,
    getRowsForPanel({
      panel: selectedPanel,
      canDashboardDispatch,
      canDashboardJuridical,
      canDashboardExpedients,
      today,
      tomorrow,
    }),
  ]);

  const cards = [
    {
      panel: "dispatch" as const,
      visible: canDashboardDispatch,
      label: "Reclamos pendientes",
      value: pendingDispatch,
      icon: <ClipboardList className="h-5 w-5" />,
      hint: "Recibidos o en gestión",
    },
    {
      panel: "juridical" as const,
      visible: canDashboardJuridical,
      label: "Intervenciones abiertas",
      value: openJuridical,
      icon: <Scale className="h-5 w-5" />,
      hint: "Orientación o seguimiento",
    },
    {
      panel: "followups" as const,
      visible: canDashboardFollowUps,
      label: "Seguimientos de hoy",
      value: todayJuridicalActions,
      icon: <TimerReset className="h-5 w-5" />,
      hint: "Acciones programadas",
    },
    {
      panel: "expedients" as const,
      visible: canDashboardExpedients,
      label: "Expedientes activos",
      value: activeExpedients,
      icon: <BriefcaseBusiness className="h-5 w-5" />,
      hint: "En trámite administrativo",
    },
  ].filter((card) => card.visible);

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Panel operativo con indicadores del día y tablas dinámicas según el rol."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.panel}
            label={card.label}
            value={card.value}
            icon={card.icon}
            hint={card.hint}
            href={dashboardHref(card.panel)}
            active={selectedPanel === card.panel}
          />
        ))}
      </div>

      <DashboardTable panel={selectedPanel} rows={rows} />
    </>
  );
}

function DashboardTable({ panel, rows }: { panel: DashboardPanel; rows: DashboardRow[] }) {
  const copy = panelCopy[panel];
  const empty = rows.length === 0;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#d7e4ee] bg-[#fbfdff]/[0.96] shadow-[0_18px_42px_rgba(26,68,104,0.08)]">
      <div className="flex flex-col gap-3 border-b border-[#d7e4ee] bg-gradient-to-r from-[#f7fbfd] to-[#edf5f9] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#172033]">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#607589]">{copy.description}</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#2f4c63] ring-1 ring-[#d7e4ee]">
          {rows.length} registros
        </span>
      </div>

      {empty ? (
        <div className="px-5 py-12 text-center text-sm font-medium text-[#607589]">{copy.empty}</div>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full table-fixed divide-y divide-[#d7e4ee] text-sm">
              <thead className="bg-gradient-to-r from-[#f7fbfd] to-[#edf5f9]">
                <tr>
                  <DashboardTh className="w-[18.5%]">Número</DashboardTh>
                  <DashboardTh className="w-[18.5%]">Fecha y hora / Reportado por</DashboardTh>
                  <DashboardTh className="w-[26%]">Solicitante</DashboardTh>
                  <DashboardTh className="w-[18.5%]">Categoría</DashboardTh>
                  <DashboardTh className="w-[18.5%]">Prioridad / Estado</DashboardTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6eef4] bg-white/[0.85]">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-[#f4f9fc]">
                    <td className="px-4 py-3 align-top">
                      <Link href={row.href} className="inline-flex whitespace-nowrap items-center gap-2 font-semibold text-[#173f63] hover:text-[#255f85] hover:underline">
                        {row.number}
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top text-[#334b5f]">
                      <p className="font-semibold text-[#172033]">{formatDateTime(row.dateTime)}</p>
                      <p className="mt-1 text-xs font-medium text-[#607589]">Reportado por: {row.reportedBy}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-[#334b5f]">
                      <p className="whitespace-normal break-words [overflow-wrap:anywhere]">{row.requester}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-[#334b5f]">
                      <p className="whitespace-normal break-words [overflow-wrap:anywhere]">{row.category}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-2">
                        <div className="grid grid-cols-[64px_110px] items-center gap-2">
                          <span className="text-xs font-medium text-[#607589]">Prioridad:</span>
                          <StatusBadge value={row.priority} />
                        </div>
                        <div className="grid grid-cols-[64px_110px] items-center gap-2">
                          <span className="text-xs font-medium text-[#607589]">Estado:</span>
                          <StatusBadge value={row.status} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {rows.map((row) => (
              <Link key={row.id} href={row.href} className="rounded-2xl border border-[#d7e4ee] bg-white/[0.92] p-4 shadow-[0_14px_30px_rgba(26,68,104,0.08)] transition duration-200 active:scale-[0.99]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="whitespace-nowrap font-semibold text-[#173f63]">{row.number}</p>
                    <p className="mt-1 text-xs font-medium text-[#607589]">{formatDateTime(row.dateTime)}</p>
                    <p className="mt-1 text-xs font-medium text-[#607589]">Reportado por: {row.reportedBy}</p>
                  </div>
                  <Eye className="h-4 w-4 shrink-0 text-[#255f85]" />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#334b5f]">
                  <p className="break-words [overflow-wrap:anywhere]"><span className="font-semibold text-[#172033]">Solicitante:</span> {row.requester}</p>
                  <p className="break-words [overflow-wrap:anywhere]"><span className="font-semibold text-[#172033]">Categoría:</span> {row.category}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge value={row.priority} />
                  <StatusBadge value={row.status} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DashboardTh({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] text-[#607589] ${className ?? ""}`}>
      {children}
    </th>
  );
}
