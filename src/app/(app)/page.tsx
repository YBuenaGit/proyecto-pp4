import Link from "next/link";
import { BriefcaseBusiness, CalendarCheck, CalendarDays, ClipboardList, Eye, Newspaper, Scale, TimerReset, Users } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import {
  DISPATCH_CATEGORY_LABELS,
  EXPEDIENT_CATEGORY_LABELS,
  JURIDICAL_TYPE_LABELS,
} from "@/lib/constants";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS } from "@/lib/appointment-constants";
import { canAccessAgenda } from "@/lib/appointment-permissions";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { canAccessDispatch, canAccessExpedients, canAccessJuridical, isAdmin, isDirectivo } from "@/lib/rbac";
import { param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";

const pendingDispatchStatuses = ["RECIBIDO", "EN_ANALISIS", "EN_GESTION"];
const openJuridicalStatuses = ["RECIBIDO", "EN_ORIENTACION", "PENDIENTE_DOCUMENTACION", "EN_SEGUIMIENTO"];
const activeExpedientStatuses = ["INICIADO", "EN_TRAMITE", "OBSERVADO", "EN_APROBACION", "APROBADO"];

type DashboardPanel = "dispatch" | "juridical" | "followups" | "expedients";
type DayPanel = "news" | "agenda" | "myAgenda" | "groupAgenda";

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

type DayRow = {
  id: string;
  href: string;
  time: string;
  type: string;
  detail: string;
  owner: string;
  status: string;
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

const dayPanelCopy: Record<DayPanel, { label: string; title: string; empty: string }> = {
  news: {
    label: "Novedades del día",
    title: "Novedades del día",
    empty: "No hay novedades cargadas para hoy.",
  },
  agenda: {
    label: "Agenda",
    title: "Agenda del día",
    empty: "No hay compromisos agendados para hoy.",
  },
  myAgenda: {
    label: "Mi agenda",
    title: "Mi agenda de hoy",
    empty: "No hay compromisos agendados para hoy.",
  },
  groupAgenda: {
    label: "Agenda grupal",
    title: "Agenda grupal de hoy",
    empty: "No hay compromisos grupales agendados para hoy.",
  },
};

function dashboardHref(panel: DashboardPanel) {
  return `/?panel=${panel}`;
}

function dayHref(panel: DayPanel) {
  return `/?dayPanel=${panel}`;
}

function normalizePanel(value: string | undefined, availablePanels: DashboardPanel[], fallback: DashboardPanel) {
  return availablePanels.includes(value as DashboardPanel) ? (value as DashboardPanel) : fallback;
}

function normalizeDayPanel(value: string | undefined, availablePanels: DayPanel[]) {
  return availablePanels.includes(value as DayPanel) ? (value as DayPanel) : availablePanels[0] ?? "news";
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

function dateValue(value: Date | string | null | undefined) {
  if (!value) return new Date(0);
  return value;
}

function reportedBy(value: string | null | undefined) {
  return value ?? "Sin datos";
}

function appointmentType(value: string) {
  return APPOINTMENT_TYPE_LABELS[value as keyof typeof APPOINTMENT_TYPE_LABELS] ?? labelFromValue(value);
}

function appointmentStatus(value: string) {
  return APPOINTMENT_STATUS_LABELS[value as keyof typeof APPOINTMENT_STATUS_LABELS] ?? labelFromValue(value);
}

function defaultPanel(availablePanels: DashboardPanel[]) {
  return availablePanels[0] ?? "dispatch";
}

async function countByStatuses(table: "DispatchRecord" | "JuridicalIntervention" | "InternalExpedient", statuses: string[]) {
  if (table === "DispatchRecord") return prisma.dispatchRecord.count({ where: { status: { in: statuses } } });
  if (table === "JuridicalIntervention") {
    return prisma.juridicalIntervention.count({ where: { status: { in: statuses } } });
  }
  return prisma.internalExpedient.count({ where: { status: { in: statuses } } });
}

async function countTodayJuridicalActions(today: Date, tomorrow: Date) {
  return prisma.juridicalAction.count({
    where: {
      nextStepDate: { gte: today, lt: tomorrow },
      juridicalIntervention: { status: { in: openJuridicalStatuses } },
    },
  });
}

async function getTodayNews(today: Date, tomorrow: Date, canDashboardDispatch: boolean): Promise<DayRow[]> {
  if (!canDashboardDispatch) return [];
  const records = await prisma.dispatchRecord.findMany({
    where: { attendedAt: { gte: today, lt: tomorrow } },
    include: { createdBy: { select: { name: true } } },
    orderBy: { attendedAt: "desc" },
    take: 10,
  });

  return records.map((record) => ({
    id: record.id,
    href: `/despacho/${record.id}`,
    time: formatDateTime(record.attendedAt),
    type: categoryLabel(DISPATCH_CATEGORY_LABELS, record.category),
    detail: requesterFrom(record),
    owner: reportedBy(record.createdBy.name),
    status: record.status,
  }));
}

async function getTodayAppointments({
  panel,
  dateKey,
  userId,
  canDashboardAgenda,
}: {
  panel: DayPanel;
  dateKey: string;
  userId: string;
  canDashboardAgenda: boolean;
}): Promise<DayRow[]> {
  if (!canDashboardAgenda || panel === "news") return [];

  const appointments = await prisma.appointment.findMany({
    where: {
      date: dateKey,
      ...(panel === "myAgenda" ? { OR: [{ ownerUserId: userId }, { assignedUserId: userId }, { assignedLawyerId: userId }] } : {}),
      ...(panel === "groupAgenda" ? { calendarScope: { in: ["lawyers", "dispatch"] } } : {}),
    },
    include: {
      owner: { select: { name: true } },
      createdBy: { select: { name: true } },
      assignedUser: { select: { name: true } },
      assignedLawyer: { select: { name: true } },
    },
    orderBy: [{ startTime: "asc" }, { createdAt: "desc" }],
    take: 10,
  });

  return appointments.map((appointment) => ({
    id: appointment.id,
    href: `/agenda?day=${appointment.date}&month=${appointment.date.slice(0, 7)}&scope=${appointment.calendarScope}`,
    time: appointment.endTime ? `${appointment.startTime} - ${appointment.endTime}` : appointment.startTime,
    type: appointmentType(appointment.type),
    detail: appointment.title,
    owner: appointment.owner?.name ?? appointment.assignedUser?.name ?? appointment.assignedLawyer?.name ?? appointment.createdBy.name,
    status: appointmentStatus(appointment.status),
  }));
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
    const priorityRank: Record<string, number> = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };
    const records = await prisma.dispatchRecord.findMany({
      where: { status: { in: pendingDispatchStatuses } },
      include: { createdBy: { select: { name: true } } },
      orderBy: { attendedAt: "desc" },
      take: 100,
    });

    return records
      .sort((a, b) => {
        const byPriority = (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
        return byPriority || b.attendedAt.getTime() - a.attendedAt.getTime();
      })
      .slice(0, 10)
      .map((record) => ({
        id: record.id,
        number: record.internalNumber,
        href: `/despacho/${record.id}`,
        dateTime: dateValue(record.attendedAt),
        reportedBy: reportedBy(record.createdBy.name),
        requester: requesterFrom(record),
        category: categoryLabel(DISPATCH_CATEGORY_LABELS, record.category),
        priority: record.priority,
        status: record.status,
      }));
  }

  if (panel === "juridical" && canDashboardJuridical) {
    const urgencyRank: Record<string, number> = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };
    const interventions = await prisma.juridicalIntervention.findMany({
      where: { status: { in: openJuridicalStatuses } },
      include: { createdBy: { select: { name: true } } },
      orderBy: { attendedAt: "desc" },
      take: 100,
    });

    return interventions
      .sort((a, b) => {
        const byUrgency = (urgencyRank[b.urgency] ?? 0) - (urgencyRank[a.urgency] ?? 0);
        return byUrgency || b.attendedAt.getTime() - a.attendedAt.getTime();
      })
      .slice(0, 10)
      .map((intervention) => ({
        id: intervention.id,
        number: intervention.internalNumber,
        href: `/intervenciones/${intervention.id}`,
        dateTime: dateValue(intervention.attendedAt),
        reportedBy: reportedBy(intervention.createdBy.name),
        requester: requesterFrom(intervention),
        category: categoryLabel(JURIDICAL_TYPE_LABELS, intervention.type),
        priority: intervention.urgency,
        status: intervention.status,
      }));
  }

  if (panel === "followups" && canDashboardJuridical) {
    const actions = await prisma.juridicalAction.findMany({
      where: {
        nextStepDate: { gte: today, lt: tomorrow },
        juridicalIntervention: { status: { in: openJuridicalStatuses } },
      },
      include: {
        createdBy: { select: { name: true } },
        juridicalIntervention: {
          select: {
            internalNumber: true,
            nameSnapshot: true,
            urgency: true,
            status: true,
          },
        },
      },
      orderBy: [{ nextStepDate: "asc" }, { createdAt: "desc" }],
      take: 10,
    });

    return actions.map((action) => ({
      id: action.id,
      number: action.juridicalIntervention.internalNumber,
      href: `/intervenciones/${action.juridicalInterventionId}`,
      dateTime: dateValue(action.nextStepDate ?? action.createdAt),
      reportedBy: reportedBy(action.createdBy.name),
      requester: requesterFrom(action.juridicalIntervention),
      category: `Intervenciones · ${labelFromValue(action.actionType)}`,
      priority: action.juridicalIntervention.urgency,
      status: action.juridicalIntervention.status,
    }));
  }

  if (panel === "expedients" && canDashboardExpedients) {
    const expedients = await prisma.internalExpedient.findMany({
      where: { status: { in: activeExpedientStatuses } },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return expedients.map((expedient) => ({
      id: expedient.id,
      number: expedient.expedienteNumber ?? expedient.internalNumber,
      href: `/despacho/expedientes/${expedient.id}`,
      dateTime: dateValue(expedient.createdAt),
      reportedBy: reportedBy(expedient.createdBy.name),
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
  const canDashboardAgenda = canAccessAgenda(user) || hasDashboardOverview;
  const canDashboardFollowUps = canDashboardDispatch || canDashboardJuridical || canDashboardExpedients;

  const availablePanels: DashboardPanel[] = [
    ...(canDashboardDispatch ? (["dispatch"] as const) : []),
    ...(canDashboardJuridical ? (["juridical"] as const) : []),
    ...(canDashboardFollowUps ? (["followups"] as const) : []),
    ...(canDashboardExpedients ? (["expedients"] as const) : []),
  ];

  const selectedPanel = normalizePanel(param(params, "panel"), availablePanels, defaultPanel(availablePanels));
  const availableDayPanels: DayPanel[] = [
    ...(canDashboardDispatch ? (["news"] as const) : []),
    ...(canDashboardAgenda ? (["agenda", "myAgenda", "groupAgenda"] as const) : []),
  ];
  const selectedDayPanel = normalizeDayPanel(param(params, "dayPanel"), availableDayPanels);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayKey = today.toISOString().slice(0, 10);

  const [
    pendingDispatch,
    openJuridical,
    todayJuridicalActions,
    activeExpedients,
    todayNewsRows,
    todayAgendaRows,
    todayMyAgendaRows,
    todayGroupAgendaRows,
    dayRows,
    rows,
  ] = await Promise.all([
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
    getTodayNews(today, tomorrow, canDashboardDispatch),
    getTodayAppointments({ panel: "agenda", dateKey: todayKey, userId: user.id, canDashboardAgenda }),
    getTodayAppointments({ panel: "myAgenda", dateKey: todayKey, userId: user.id, canDashboardAgenda }),
    getTodayAppointments({ panel: "groupAgenda", dateKey: todayKey, userId: user.id, canDashboardAgenda }),
    selectedDayPanel === "news"
      ? getTodayNews(today, tomorrow, canDashboardDispatch)
      : getTodayAppointments({ panel: selectedDayPanel, dateKey: todayKey, userId: user.id, canDashboardAgenda }),
    getRowsForPanel({
      panel: selectedPanel,
      canDashboardDispatch,
      canDashboardJuridical,
      canDashboardExpedients,
      today,
      tomorrow,
    }),
  ]);

  const dayCards = [
    {
      panel: "news" as const,
      visible: canDashboardDispatch,
      label: dayPanelCopy.news.label,
      value: todayNewsRows.length,
      icon: <Newspaper className="h-5 w-5" />,
      hint: "Cargadas hoy",
    },
    {
      panel: "agenda" as const,
      visible: canDashboardAgenda,
      label: dayPanelCopy.agenda.label,
      value: todayAgendaRows.length,
      icon: <CalendarDays className="h-5 w-5" />,
      hint: "Compromisos de hoy",
    },
    {
      panel: "myAgenda" as const,
      visible: canDashboardAgenda,
      label: dayPanelCopy.myAgenda.label,
      value: todayMyAgendaRows.length,
      icon: <CalendarCheck className="h-5 w-5" />,
      hint: "Asignados a mi usuario",
    },
    {
      panel: "groupAgenda" as const,
      visible: canDashboardAgenda,
      label: dayPanelCopy.groupAgenda.label,
      value: todayGroupAgendaRows.length,
      icon: <Users className="h-5 w-5" />,
      hint: "Agendas compartidas",
    },
  ].filter((card) => card.visible);

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
        breadcrumbs={[{ label: "Inicio" }]}
      />

      {dayCards.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dayCards.map((card) => (
              <KpiCard
                key={card.panel}
                label={card.label}
                value={card.value}
                icon={card.icon}
                hint={card.hint}
                href={dayHref(card.panel)}
                active={selectedDayPanel === card.panel}
              />
            ))}
          </div>

          <DaySummaryTable panel={selectedDayPanel} rows={dayRows} />
        </>
      ) : null}

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

function DaySummaryTable({ panel, rows }: { panel: DayPanel; rows: DayRow[] }) {
  const copy = dayPanelCopy[panel];

  return (
    <div className="mt-4">
      <Table
        title={copy.title}
        itemLabel="registros"
        total={rows.length}
        showPagination={false}
        headers={["Hora", "Tipo", "Detalle", "Responsable", "Estado"]}
        empty={!rows.length}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>
              <Link href={row.href} className="inline-flex items-center gap-2 font-semibold text-[#0667b0] hover:underline">
                {row.time}
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Td>
            <Td>{row.type}</Td>
            <Td>{row.detail}</Td>
            <Td>{row.owner}</Td>
            <Td><StatusBadge value={row.status} /></Td>
          </tr>
        ))}
      </Table>
      {!rows.length ? <p className="mt-2 text-sm font-medium text-[#6c757d]">{copy.empty}</p> : null}
    </div>
  );
}

function DashboardTable({ panel, rows }: { panel: DashboardPanel; rows: DashboardRow[] }) {
  const copy = panelCopy[panel];
  const empty = rows.length === 0;

  return (
    <section className="mt-4 overflow-hidden rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-[#212529]">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#6c757d]">{copy.description}</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-sm border border-[#dee2e6] bg-white px-2.5 py-1 text-xs font-semibold text-[#495057]">
          {rows.length} registros
        </span>
      </div>

      {empty ? (
        <div className="px-5 py-10 text-center text-sm font-medium text-[#6c757d]">{copy.empty}</div>
      ) : (
        <>
          <div className="hidden overflow-hidden md:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-[#e9ecef]">
                <tr>
                  <DashboardTh>Número</DashboardTh>
                  <DashboardTh>Fecha y hora / Reportado por</DashboardTh>
                  <DashboardTh>Solicitante</DashboardTh>
                  <DashboardTh>Categoría</DashboardTh>
                  <DashboardTh>Prioridad / Estado</DashboardTh>
                </tr>
              </thead>
              <tbody className="bg-white [&_tr:hover]:bg-[#c4e7f3]/65">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-[#dee2e6] px-2.5 py-2 align-top">
                      <Link href={row.href} className="inline-flex whitespace-nowrap items-center gap-2 font-semibold text-[#0667b0] hover:text-[#0a61b9] hover:underline">
                        {row.number}
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                    <td className="border border-[#dee2e6] px-2.5 py-2 align-top text-[#212529]">
                      <p className="font-semibold text-[#212529]">{formatDateTime(row.dateTime)}</p>
                      <p className="mt-1 text-xs font-medium text-[#6c757d]">Reportado por: {row.reportedBy}</p>
                    </td>
                    <td className="border border-[#dee2e6] px-2.5 py-2 align-top text-[#212529]">
                      <p className="whitespace-normal break-words [overflow-wrap:anywhere]">{row.requester}</p>
                    </td>
                    <td className="border border-[#dee2e6] px-2.5 py-2 align-top text-[#212529]">
                      <p className="whitespace-normal break-words [overflow-wrap:anywhere]">{row.category}</p>
                    </td>
                    <td className="border border-[#dee2e6] px-2.5 py-2 align-top">
                      <div className="space-y-2">
                        <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center gap-2">
                          <span className="text-xs font-medium text-[#6c757d]">Prioridad:</span>
                          <StatusBadge value={row.priority} />
                        </div>
                        <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center gap-2">
                          <span className="text-xs font-medium text-[#6c757d]">Estado:</span>
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
              <Link key={row.id} href={row.href} className="rounded-sm border border-[#dee2e6] bg-white p-3 shadow-sm transition duration-150 active:translate-y-px">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="whitespace-nowrap font-semibold text-[#0667b0]">{row.number}</p>
                    <p className="mt-1 text-xs font-medium text-[#6c757d]">{formatDateTime(row.dateTime)}</p>
                    <p className="mt-1 text-xs font-medium text-[#6c757d]">Reportado por: {row.reportedBy}</p>
                  </div>
                  <Eye className="h-4 w-4 shrink-0 text-[#0667b0]" />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#212529]">
                  <p className="break-words [overflow-wrap:anywhere]"><span className="font-semibold text-[#212529]">Solicitante:</span> {row.requester}</p>
                  <p className="break-words [overflow-wrap:anywhere]"><span className="font-semibold text-[#212529]">Categoría:</span> {row.category}</p>
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
    <th className={`border border-[#dee2e6] px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-normal text-[#495057] ${className ?? ""}`}>
      {children}
    </th>
  );
}
