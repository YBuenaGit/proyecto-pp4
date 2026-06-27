import Link from "next/link";
import { BriefcaseBusiness, CalendarCheck, ClipboardList, Eye, Newspaper, Scale, Users } from "lucide-react";
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
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS, type CalendarScope } from "@/lib/appointment-constants";
import { canAccessAgenda, getAllowedCalendarScopes } from "@/lib/appointment-permissions";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { canAccessDispatch, canAccessExpedients, canAccessJuridical, isAdmin, isDirectivo } from "@/lib/rbac";
import { param } from "@/lib/search";
import { personDisplayName } from "@/lib/text";
import type { SearchParams } from "@/lib/types";

const pendingDispatchStatuses = ["RECIBIDO", "EN_ANALISIS", "EN_GESTION"];
const openJuridicalStatuses = ["RECIBIDO", "EN_ORIENTACION", "PENDIENTE_DOCUMENTACION", "EN_SEGUIMIENTO"];
const activeExpedientStatuses = ["INICIADO", "EN_TRAMITE", "OBSERVADO", "EN_APROBACION", "APROBADO"];

type DashboardPanel = "dispatch" | "juridical" | "expedients";
type DayPanel = "news" | "myAgenda" | "groupAgenda";

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
  expedients: {
    title: "Tabla de expedientes activos",
    description: "Expedientes internos iniciados o en trámite administrativo.",
    empty: "No hay expedientes activos para mostrar.",
  },
};

const dayPanelCopy: Record<DayPanel, { label: string; title: string; empty: string }> = {
  news: {
    label: "Atenciones de hoy",
    title: "Atenciones de Despacho cargadas hoy",
    empty: "No hay atenciones de Despacho cargadas para hoy.",
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

function requesterFrom(record: {
  nameSnapshot?: string | null;
  linkedPersons?: Array<{ firstName: string | null; apellidoApodoManual: string | null }>;
}) {
  const linkedPerson = record.linkedPersons?.[0];
  return personDisplayName(linkedPerson?.apellidoApodoManual, linkedPerson?.firstName) || record.nameSnapshot || "Sin datos";
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

async function getTodayNews(today: Date, tomorrow: Date, canDashboardDispatch: boolean): Promise<DayRow[]> {
  if (!canDashboardDispatch) return [];
  const records = await prisma.dispatchRecord.findMany({
    where: { attendedAt: { gte: today, lt: tomorrow } },
    include: {
      createdBy: { select: { name: true } },
      linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
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
  groupScopes,
}: {
  panel: DayPanel;
  dateKey: string;
  userId: string;
  canDashboardAgenda: boolean;
  groupScopes: CalendarScope[];
}): Promise<DayRow[]> {
  if (!canDashboardAgenda || panel === "news") return [];
  if (panel === "groupAgenda" && groupScopes.length === 0) return [];

  const appointments = await prisma.appointment.findMany({
    where: {
      date: dateKey,
      ...(panel === "myAgenda" ? { OR: [{ ownerUserId: userId }, { assignedUserId: userId }, { assignedLawyerId: userId }] } : {}),
      ...(panel === "groupAgenda" ? { calendarScope: { in: groupScopes } } : {}),
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
}: {
  panel: DashboardPanel;
  canDashboardDispatch: boolean;
  canDashboardJuridical: boolean;
  canDashboardExpedients: boolean;
}): Promise<DashboardRow[]> {
  if (panel === "dispatch" && canDashboardDispatch) {
    const priorityRank: Record<string, number> = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };
    const records = await prisma.dispatchRecord.findMany({
      where: { status: { in: pendingDispatchStatuses } },
      include: {
        createdBy: { select: { name: true } },
        linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
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
      include: {
        createdBy: { select: { name: true } },
        linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
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
  const dashboardGroupScopes: CalendarScope[] = hasDashboardOverview
    ? ["lawyers", "dispatch"]
    : getAllowedCalendarScopes(user).filter((scope) => scope === "lawyers" || scope === "dispatch");

  const availablePanels: DashboardPanel[] = [
    ...(canDashboardDispatch ? (["dispatch"] as const) : []),
    ...(canDashboardJuridical ? (["juridical"] as const) : []),
    ...(canDashboardExpedients ? (["expedients"] as const) : []),
  ];

  const selectedPanel = normalizePanel(param(params, "panel"), availablePanels, defaultPanel(availablePanels));
  const availableDayPanels: DayPanel[] = [
    ...(canDashboardDispatch ? (["news"] as const) : []),
    ...(canDashboardAgenda ? (["myAgenda", "groupAgenda"] as const) : []),
  ];
  const selectedDayPanelParam = param(params, "dayPanel");
  const selectedDayPanel = selectedDayPanelParam ? normalizeDayPanel(selectedDayPanelParam, availableDayPanels) : undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayKey = today.toISOString().slice(0, 10);

  const [
    pendingDispatch,
    openJuridical,
    activeExpedients,
    todayNewsRows,
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
    canDashboardExpedients
      ? countByStatuses("InternalExpedient", activeExpedientStatuses)
      : 0,
    getTodayNews(today, tomorrow, canDashboardDispatch),
    getTodayAppointments({ panel: "myAgenda", dateKey: todayKey, userId: user.id, canDashboardAgenda, groupScopes: dashboardGroupScopes }),
    getTodayAppointments({ panel: "groupAgenda", dateKey: todayKey, userId: user.id, canDashboardAgenda, groupScopes: dashboardGroupScopes }),
    selectedDayPanel
      ? selectedDayPanel === "news"
        ? getTodayNews(today, tomorrow, canDashboardDispatch)
        : getTodayAppointments({ panel: selectedDayPanel, dateKey: todayKey, userId: user.id, canDashboardAgenda, groupScopes: dashboardGroupScopes })
      : [],
    getRowsForPanel({
      panel: selectedPanel,
      canDashboardDispatch,
      canDashboardJuridical,
      canDashboardExpedients,
    }),
  ]);

  const dayCards = [
    {
      panel: "news" as const,
      visible: canDashboardDispatch,
      label: dayPanelCopy.news.label,
      value: todayNewsRows.length,
      icon: <Newspaper className="h-5 w-5" />,
      hint: "Atenciones cargadas hoy",
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
        breadcrumbs={[{ label: "Inicio" }]}
      />

      {dayCards.length ? (
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
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.panel}
            label={card.label}
            value={card.value}
            icon={card.icon}
            hint={card.hint}
            href={dashboardHref(card.panel)}
            active={!selectedDayPanel && selectedPanel === card.panel}
          />
        ))}
      </div>

      {selectedDayPanel ? <DaySummaryTable panel={selectedDayPanel} rows={dayRows} /> : <DashboardTable panel={selectedPanel} rows={rows} />}
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

  return (
    <div className="mt-4">
      <Table
        title={copy.title}
        itemLabel="registros"
        total={rows.length}
        showPagination={false}
        headers={["Numero", "Fecha y hora / Reportado por", "Solicitante", "Categoria", "Prioridad / Estado"]}
        empty={!rows.length}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>
              <Link href={row.href} className="inline-flex whitespace-nowrap items-center gap-2 font-semibold text-[#0667b0] hover:text-[#0a61b9] hover:underline">
                {row.number}
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Td>
            <Td>
              <p className="font-semibold text-[#212529]">{formatDateTime(row.dateTime)}</p>
              <p className="mt-1 text-xs font-medium text-[#6c757d]">Reportado por: {row.reportedBy}</p>
            </Td>
            <Td>{row.requester}</Td>
            <Td>{row.category}</Td>
            <Td>
              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center justify-center gap-2">
                  <span className="text-xs font-medium text-[#6c757d]">Prioridad:</span>
                  <StatusBadge value={row.priority} />
                </div>
                <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center justify-center gap-2">
                  <span className="text-xs font-medium text-[#6c757d]">Estado:</span>
                  <StatusBadge value={row.status} />
                </div>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
