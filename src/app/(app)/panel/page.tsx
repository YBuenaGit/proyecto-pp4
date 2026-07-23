import Link from "next/link";
import { BriefcaseBusiness, CalendarCheck, ClipboardList, Eye, GitBranch, Newspaper, Scale, Users } from "lucide-react";
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
import { argentinaDayRange, toArgentinaDateKey } from "@/lib/argentina-time";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS, type CalendarScope } from "@/lib/appointment-constants";
import { canAccessAgenda, getGroupCalendarScopes } from "@/lib/appointment-permissions";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { canAccessDispatch, canAccessExpedients, canAccessJuridical, isAdmin, isDirectivo } from "@/lib/rbac";
import { pagination, param } from "@/lib/search";
import { personDisplayName } from "@/lib/text";
import type { SearchParams } from "@/lib/types";

const pendingDispatchStatuses = ["RECIBIDO", "EN_ANALISIS", "EN_GESTION"];
const openJuridicalStatuses = ["RECIBIDO", "EN_ORIENTACION", "PENDIENTE_DOCUMENTACION", "EN_SEGUIMIENTO"];
const pendingJuridicalStatuses = ["RECIBIDO", "PENDIENTE_DOCUMENTACION"];
const activeExpedientStatuses = ["INICIADO", "EN_TRAMITE", "OBSERVADO", "EN_APROBACION", "APROBADO"];
const activeReferralStatuses = ["PENDIENTE", "RECIBIDA", "EN_GESTION"];

type DashboardPanel = "dispatch" | "juridical" | "juridicalPending" | "expedients" | "referrals";
type DayPanel = "news" | "juridicalToday" | "myAgenda" | "groupAgenda";

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

type TablePage<Row> = {
  rows: Row[];
  total: number;
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
  juridicalPending: {
    title: "Tabla de intervenciones pendientes",
    description: "Intervenciones recibidas o pendientes de documentacion.",
    empty: "No hay intervenciones pendientes para mostrar.",
  },
  expedients: {
    title: "Tabla de expedientes activos",
    description: "Expedientes internos iniciados o en trámite administrativo.",
    empty: "No hay expedientes activos para mostrar.",
  },
  referrals: {
    title: "Tabla de derivaciones recibidas",
    description: "Derivaciones activas recibidas por el area visible para este rol.",
    empty: "No hay derivaciones recibidas para mostrar.",
  },
};

const dayPanelCopy: Record<DayPanel, { label: string; title: string; empty: string }> = {
  news: {
    label: "Atenciones de hoy",
    title: "Atenciones de Despacho cargadas hoy",
    empty: "No hay atenciones de Despacho cargadas para hoy.",
  },
  juridicalToday: {
    label: "Atenciones de hoy",
    title: "Intervenciones juridicas cargadas hoy",
    empty: "No hay intervenciones juridicas cargadas para hoy.",
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
  return `/panel?panel=${panel}`;
}

function dayHref(panel: DayPanel) {
  return `/panel?dayPanel=${panel}`;
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

function emptyPage<Row>(): TablePage<Row> {
  return { rows: [], total: 0 };
}

function moduleLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    DESPACHO: "Despacho",
    JURIDICO: "Juridico",
    DIRECTIVO: "Directivo",
  };
  return labels[value ?? ""] ?? labelFromValue(value ?? "");
}

function referralDestinationModules({
  canDashboardDispatch,
  canDashboardJuridical,
  canDashboardDirectivo,
}: {
  canDashboardDispatch: boolean;
  canDashboardJuridical: boolean;
  canDashboardDirectivo: boolean;
}) {
  return [
    ...(canDashboardDispatch ? ["DESPACHO"] : []),
    ...(canDashboardJuridical ? ["JURIDICO"] : []),
    ...(canDashboardDirectivo ? ["DIRECTIVO"] : []),
  ];
}

async function countByStatuses(table: "DispatchRecord" | "JuridicalIntervention" | "InternalExpedient", statuses: string[]) {
  if (table === "DispatchRecord") return prisma.dispatchRecord.count({ where: { status: { in: statuses } } });
  if (table === "JuridicalIntervention") {
    return prisma.juridicalIntervention.count({ where: { status: { in: statuses } } });
  }
  return prisma.internalExpedient.count({ where: { status: { in: statuses } } });
}

async function countReceivedReferrals({
  canDashboardDispatch,
  canDashboardJuridical,
  canDashboardDirectivo,
}: {
  canDashboardDispatch: boolean;
  canDashboardJuridical: boolean;
  canDashboardDirectivo: boolean;
}) {
  const destinationModules = referralDestinationModules({ canDashboardDispatch, canDashboardJuridical, canDashboardDirectivo });
  if (!destinationModules.length) return 0;

  return prisma.referral.count({
    where: {
      destinationModule: { in: destinationModules },
      status: { in: activeReferralStatuses },
    },
  });
}

async function getTodayNews({
  today,
  tomorrow,
  canDashboardDispatch,
  skip,
  take,
}: {
  today: Date;
  tomorrow: Date;
  canDashboardDispatch: boolean;
  skip: number;
  take: number;
}): Promise<TablePage<DayRow>> {
  if (!canDashboardDispatch) return emptyPage();
  const where = { attendedAt: { gte: today, lt: tomorrow } };
  const [records, total] = await Promise.all([
    prisma.dispatchRecord.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.dispatchRecord.count({ where }),
  ]);

  return {
    total,
    rows: records.map((record) => ({
      id: record.id,
      href: `/despacho/${record.id}`,
      time: formatDateTime(record.attendedAt),
      type: categoryLabel(DISPATCH_CATEGORY_LABELS, record.category),
      detail: requesterFrom(record),
      owner: reportedBy(record.createdBy.name),
      status: record.status,
    })),
  };
}

async function getTodayJuridical({
  today,
  tomorrow,
  canDashboardJuridical,
  skip,
  take,
}: {
  today: Date;
  tomorrow: Date;
  canDashboardJuridical: boolean;
  skip: number;
  take: number;
}): Promise<TablePage<DayRow>> {
  if (!canDashboardJuridical) return emptyPage();
  const where = { attendedAt: { gte: today, lt: tomorrow } };
  const [interventions, total] = await Promise.all([
    prisma.juridicalIntervention.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.juridicalIntervention.count({ where }),
  ]);

  return {
    total,
    rows: interventions.map((intervention) => ({
      id: intervention.id,
      href: `/intervenciones/${intervention.id}`,
      time: formatDateTime(intervention.attendedAt),
      type: categoryLabel(JURIDICAL_TYPE_LABELS, intervention.type),
      detail: requesterFrom(intervention),
      owner: reportedBy(intervention.createdBy.name),
      status: intervention.status,
    })),
  };
}

async function getTodayAppointments({
  panel,
  dateKey,
  userId,
  canDashboardAgenda,
  groupScopes,
  skip,
  take,
}: {
  panel: DayPanel;
  dateKey: string;
  userId: string;
  canDashboardAgenda: boolean;
  groupScopes: CalendarScope[];
  skip: number;
  take: number;
}): Promise<TablePage<DayRow>> {
  if (!canDashboardAgenda || panel === "news" || panel === "juridicalToday") return emptyPage();
  if (panel === "groupAgenda" && groupScopes.length === 0) return emptyPage();
  const where = {
    date: dateKey,
    ...(panel === "myAgenda" ? { OR: [{ ownerUserId: userId }, { assignedUserId: userId }, { assignedLawyerId: userId }] } : {}),
    ...(panel === "groupAgenda" ? { calendarScope: { in: groupScopes } } : {}),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignedUser: { select: { name: true } },
        assignedLawyer: { select: { name: true } },
      },
      orderBy: [{ startTime: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    total,
    rows: appointments.map((appointment) => ({
      id: appointment.id,
      href: `/agenda?day=${appointment.date}&month=${appointment.date.slice(0, 7)}&scope=${appointment.calendarScope}`,
      time: appointment.endTime ? `${appointment.startTime} - ${appointment.endTime}` : appointment.startTime,
      type: appointmentType(appointment.type),
      detail: appointment.title,
      owner: appointment.owner?.name ?? appointment.assignedUser?.name ?? appointment.assignedLawyer?.name ?? appointment.createdBy.name,
      status: appointmentStatus(appointment.status),
    })),
  };
}

async function getRowsForPanel({
  panel,
  canDashboardDispatch,
  canDashboardJuridical,
  canDashboardExpedients,
  canDashboardDirectivo,
  skip,
  take,
}: {
  panel: DashboardPanel;
  canDashboardDispatch: boolean;
  canDashboardJuridical: boolean;
  canDashboardExpedients: boolean;
  canDashboardDirectivo: boolean;
  skip: number;
  take: number;
}): Promise<TablePage<DashboardRow>> {
  if (panel === "dispatch" && canDashboardDispatch) {
    const where = { status: { in: pendingDispatchStatuses } };
    const [records, total] = await Promise.all([
      prisma.dispatchRecord.findMany({
        where,
        include: {
          createdBy: { select: { name: true } },
          linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.dispatchRecord.count({ where }),
    ]);

    return {
      total,
      rows: records.map((record) => ({
        id: record.id,
        number: record.internalNumber,
        href: `/despacho/${record.id}`,
        dateTime: dateValue(record.createdAt),
        reportedBy: reportedBy(record.createdBy.name),
        requester: requesterFrom(record),
        category: categoryLabel(DISPATCH_CATEGORY_LABELS, record.category),
        priority: record.priority,
        status: record.status,
      })),
    };
  }

  if (panel === "juridical" && canDashboardJuridical) {
    const where = { status: { in: openJuridicalStatuses } };
    const [interventions, total] = await Promise.all([
      prisma.juridicalIntervention.findMany({
        where,
        include: {
          createdBy: { select: { name: true } },
          linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.juridicalIntervention.count({ where }),
    ]);

    return {
      total,
      rows: interventions.map((intervention) => ({
        id: intervention.id,
        number: intervention.internalNumber,
        href: `/intervenciones/${intervention.id}`,
        dateTime: dateValue(intervention.createdAt),
        reportedBy: reportedBy(intervention.createdBy.name),
        requester: requesterFrom(intervention),
        category: categoryLabel(JURIDICAL_TYPE_LABELS, intervention.type),
        priority: intervention.urgency,
        status: intervention.status,
      })),
    };
  }

  if (panel === "juridicalPending" && canDashboardJuridical) {
    const where = { status: { in: pendingJuridicalStatuses } };
    const [interventions, total] = await Promise.all([
      prisma.juridicalIntervention.findMany({
        where,
        include: {
          createdBy: { select: { name: true } },
          linkedPersons: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.juridicalIntervention.count({ where }),
    ]);

    return {
      total,
      rows: interventions.map((intervention) => ({
        id: intervention.id,
        number: intervention.internalNumber,
        href: `/intervenciones/${intervention.id}`,
        dateTime: dateValue(intervention.createdAt),
        reportedBy: reportedBy(intervention.createdBy.name),
        requester: requesterFrom(intervention),
        category: categoryLabel(JURIDICAL_TYPE_LABELS, intervention.type),
        priority: intervention.urgency,
        status: intervention.status,
      })),
    };
  }

  if (panel === "expedients" && canDashboardExpedients) {
    const where = { status: { in: activeExpedientStatuses } };
    const [expedients, total] = await Promise.all([
      prisma.internalExpedient.findMany({
        where,
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.internalExpedient.count({ where }),
    ]);

    return {
      total,
      rows: expedients.map((expedient) => ({
        id: expedient.id,
        number: expedient.expedienteNumber ?? expedient.internalNumber,
        href: `/despacho/expedientes/${expedient.id}`,
        dateTime: dateValue(expedient.createdAt),
        reportedBy: reportedBy(expedient.createdBy.name),
        requester: truncate(expedient.description),
        category: categoryLabel(EXPEDIENT_CATEGORY_LABELS, expedient.category),
        priority: "NO_APLICA",
        status: expedient.status,
      })),
    };
  }

  if (panel === "referrals") {
    const destinationModules = referralDestinationModules({ canDashboardDispatch, canDashboardJuridical, canDashboardDirectivo });
    if (!destinationModules.length) return emptyPage();
    const where = {
      destinationModule: { in: destinationModules },
      status: { in: activeReferralStatuses },
    };

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          referredBy: { select: { name: true } },
          destinationDispatchRecord: { select: { id: true, internalNumber: true } },
          destinationJuridicalIntervention: { select: { id: true, internalNumber: true } },
          originDispatchRecord: { select: { id: true, internalNumber: true } },
          originJuridicalIntervention: { select: { id: true, internalNumber: true } },
        },
        orderBy: { referredAt: "desc" },
        skip,
        take,
      }),
      prisma.referral.count({ where }),
    ]);

    return {
      total,
      rows: referrals.map((referral) => {
        const href = referral.destinationDispatchRecord
          ? `/despacho/${referral.destinationDispatchRecord.id}`
          : referral.destinationJuridicalIntervention
            ? `/intervenciones/${referral.destinationJuridicalIntervention.id}`
            : referral.originDispatchRecord
              ? `/despacho/${referral.originDispatchRecord.id}`
              : referral.originJuridicalIntervention
                ? `/intervenciones/${referral.originJuridicalIntervention.id}`
                : "/";
        const number =
          referral.destinationDispatchRecord?.internalNumber ??
          referral.destinationJuridicalIntervention?.internalNumber ??
          referral.originDispatchRecord?.internalNumber ??
          referral.originJuridicalIntervention?.internalNumber ??
          "Derivacion";

        return {
          id: referral.id,
          number,
          href,
          dateTime: referral.referredAt,
          reportedBy: reportedBy(referral.referredBy.name),
          requester: truncate(referral.summary, 110),
          category: `${moduleLabel(referral.originModule)} -> ${moduleLabel(referral.destinationModule)}`,
          priority: "NO_APLICA",
          status: referral.status,
        };
      }),
    };
  }

  return emptyPage();
}

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const { page, pageSize, skip, take } = pagination(params);

  const hasDashboardOverview = isDirectivo(user) || isAdmin(user);
  const canDashboardDispatch = canAccessDispatch(user) || hasDashboardOverview;
  const canDashboardJuridical = canAccessJuridical(user) || hasDashboardOverview;
  const canDashboardExpedients = canAccessExpedients(user) || hasDashboardOverview;
  const canDashboardAgenda = canAccessAgenda(user) || hasDashboardOverview;
  const canDashboardReferrals = canDashboardDispatch || canDashboardJuridical || hasDashboardOverview;
  const dashboardGroupScopes: CalendarScope[] = getGroupCalendarScopes(user);
  const isDirectorsAgenda = isDirectivo(user);

  const availablePanels: DashboardPanel[] = [
    ...(canDashboardDispatch ? (["dispatch"] as const) : []),
    ...(canDashboardJuridical ? (["juridical"] as const) : []),
    ...(canDashboardJuridical ? (["juridicalPending"] as const) : []),
    ...(canDashboardExpedients ? (["expedients"] as const) : []),
    ...(canDashboardReferrals ? (["referrals"] as const) : []),
  ];

  const selectedPanel = normalizePanel(param(params, "panel"), availablePanels, defaultPanel(availablePanels));
  const availableDayPanels: DayPanel[] = [
    ...(canDashboardDispatch ? (["news"] as const) : []),
    ...(canDashboardJuridical ? (["juridicalToday"] as const) : []),
    ...(canDashboardAgenda ? (["myAgenda", "groupAgenda"] as const) : []),
  ];
  const selectedDayPanelParam = param(params, "dayPanel");
  const selectedDayPanel = selectedDayPanelParam ? normalizeDayPanel(selectedDayPanelParam, availableDayPanels) : undefined;

  const todayKey = toArgentinaDateKey();
  const { start: today, endExclusive: tomorrow } = argentinaDayRange(todayKey);

  const [
    pendingDispatch,
    openJuridical,
    pendingJuridical,
    activeExpedients,
    receivedReferrals,
    todayNewsPage,
    todayJuridicalPage,
    todayMyAgendaPage,
    todayGroupAgendaPage,
    dayPage,
    dashboardPage,
  ] = await Promise.all([
    canDashboardDispatch
      ? countByStatuses("DispatchRecord", pendingDispatchStatuses)
      : 0,
    canDashboardJuridical
      ? countByStatuses("JuridicalIntervention", openJuridicalStatuses)
      : 0,
    canDashboardJuridical
      ? countByStatuses("JuridicalIntervention", pendingJuridicalStatuses)
      : 0,
    canDashboardExpedients
      ? countByStatuses("InternalExpedient", activeExpedientStatuses)
      : 0,
    countReceivedReferrals({ canDashboardDispatch, canDashboardJuridical, canDashboardDirectivo: hasDashboardOverview }),
    getTodayNews({ today, tomorrow, canDashboardDispatch, skip, take }),
    getTodayJuridical({ today, tomorrow, canDashboardJuridical, skip, take }),
    getTodayAppointments({ panel: "myAgenda", dateKey: todayKey, userId: user.id, canDashboardAgenda, groupScopes: dashboardGroupScopes, skip, take }),
    getTodayAppointments({ panel: "groupAgenda", dateKey: todayKey, userId: user.id, canDashboardAgenda, groupScopes: dashboardGroupScopes, skip, take }),
    selectedDayPanel
      ? selectedDayPanel === "news"
        ? getTodayNews({ today, tomorrow, canDashboardDispatch, skip, take })
        : selectedDayPanel === "juridicalToday"
          ? getTodayJuridical({ today, tomorrow, canDashboardJuridical, skip, take })
          : getTodayAppointments({ panel: selectedDayPanel, dateKey: todayKey, userId: user.id, canDashboardAgenda, groupScopes: dashboardGroupScopes, skip, take })
      : emptyPage<DayRow>(),
    getRowsForPanel({
      panel: selectedPanel,
      canDashboardDispatch,
      canDashboardJuridical,
      canDashboardExpedients,
      canDashboardDirectivo: hasDashboardOverview,
      skip,
      take,
    }),
  ]);

  const dayCards = [
    {
      key: "news",
      panel: "news" as const,
      visible: canDashboardDispatch,
      label: canDashboardJuridical ? "Atenciones Despacho" : dayPanelCopy.news.label,
      value: todayNewsPage.total,
      icon: <Newspaper className="h-5 w-5" />,
      hint: "Atenciones cargadas hoy",
      href: dayHref("news"),
      active: selectedDayPanel === "news",
    },
    {
      key: "juridicalToday",
      panel: "juridicalToday" as const,
      visible: canDashboardJuridical,
      label: canDashboardDispatch ? "Atenciones Juridico" : dayPanelCopy.juridicalToday.label,
      value: todayJuridicalPage.total,
      icon: <Scale className="h-5 w-5" />,
      hint: "Intervenciones cargadas hoy",
      href: dayHref("juridicalToday"),
      active: selectedDayPanel === "juridicalToday",
    },
    {
      key: "myAgenda",
      panel: "myAgenda" as const,
      visible: canDashboardAgenda,
      label: dayPanelCopy.myAgenda.label,
      value: todayMyAgendaPage.total,
      icon: <CalendarCheck className="h-5 w-5" />,
      hint: "Asignados a mi usuario",
      href: dayHref("myAgenda"),
      active: selectedDayPanel === "myAgenda",
    },
    {
      key: "groupAgenda",
      panel: "groupAgenda" as const,
      visible: canDashboardAgenda,
      label: isDirectorsAgenda ? "Agenda de directivos" : dayPanelCopy.groupAgenda.label,
      value: todayGroupAgendaPage.total,
      icon: <Users className="h-5 w-5" />,
      hint: isDirectorsAgenda ? "Compartida solo entre directivos" : "Agendas compartidas",
      href: dayHref("groupAgenda"),
      active: selectedDayPanel === "groupAgenda",
    },
  ].filter((card) => card.visible);

  const cards = [
    {
      key: "dispatch",
      panel: "dispatch" as const,
      visible: canDashboardDispatch,
      label: "Reclamos pendientes",
      value: pendingDispatch,
      icon: <ClipboardList className="h-5 w-5" />,
      href: dashboardHref("dispatch"),
      active: !selectedDayPanel && selectedPanel === "dispatch",
      hint: "Recibidos o en gestión",
    },
    {
      key: "juridical",
      panel: "juridical" as const,
      visible: canDashboardJuridical,
      label: "Intervenciones abiertas",
      value: openJuridical,
      icon: <Scale className="h-5 w-5" />,
      href: dashboardHref("juridical"),
      active: !selectedDayPanel && selectedPanel === "juridical",
      hint: "Orientación o seguimiento",
    },
    {
      key: "juridicalPending",
      panel: "juridicalPending" as const,
      visible: canDashboardJuridical,
      label: "Intervenciones pendientes",
      value: pendingJuridical,
      icon: <Scale className="h-5 w-5" />,
      href: dashboardHref("juridicalPending"),
      active: !selectedDayPanel && selectedPanel === "juridicalPending",
      hint: "Recibidas o con documentacion pendiente",
    },
    {
      key: "expedients",
      panel: "expedients" as const,
      visible: canDashboardExpedients,
      label: "Expedientes activos",
      value: activeExpedients,
      icon: <BriefcaseBusiness className="h-5 w-5" />,
      href: dashboardHref("expedients"),
      active: !selectedDayPanel && selectedPanel === "expedients",
      hint: "En trámite administrativo",
    },
    {
      key: "referrals",
      panel: "referrals" as const,
      visible: canDashboardReferrals,
      label: "Derivaciones recibidas",
      value: receivedReferrals,
      icon: <GitBranch className="h-5 w-5" />,
      hint: "Pendientes o en gestion",
      href: dashboardHref("referrals"),
      active: !selectedDayPanel && selectedPanel === "referrals",
    },
  ].filter((card) => card.visible);
  const dashboardCards = [...dayCards, ...cards];

  return (
    <>
      <PageHeader
        title="Panel general"
        breadcrumbs={[
          { label: "Anuncios importantes", href: "/" },
          { label: "Panel general" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => (
          <KpiCard
            key={card.key}
            label={card.label}
            value={card.value}
            icon={card.icon}
            hint={card.hint}
            href={card.href}
            active={card.active}
          />
        ))}
      </div>

      {selectedDayPanel ? (
        <DaySummaryTable
          panel={selectedDayPanel}
          page={page}
          pageSize={pageSize}
          result={dayPage}
          copyOverride={
            selectedDayPanel === "groupAgenda" && isDirectorsAgenda
              ? {
                  label: "Agenda de directivos",
                  title: "Agenda de directivos de hoy",
                  empty: "No hay compromisos de directivos agendados para hoy.",
                }
              : undefined
          }
        />
      ) : (
        <DashboardTable panel={selectedPanel} page={page} pageSize={pageSize} result={dashboardPage} />
      )}
    </>
  );
}

function DaySummaryTable({
  panel,
  result,
  page,
  pageSize,
  copyOverride,
}: {
  panel: DayPanel;
  result: TablePage<DayRow>;
  page: number;
  pageSize: number;
  copyOverride?: { label: string; title: string; empty: string };
}) {
  const copy = copyOverride ?? dayPanelCopy[panel];

  return (
    <div className="mt-4">
      <Table
        title={copy.title}
        itemLabel="registros"
        total={result.total}
        page={page}
        pageSize={pageSize}
        showPagination
        headers={["Hora", "Tipo", "Detalle", "Responsable", "Estado"]}
        empty={!result.rows.length}
      >
        {result.rows.map((row) => (
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
      {!result.rows.length ? <p className="mt-2 text-sm font-medium text-[#212529]">{copy.empty}</p> : null}
    </div>
  );
}

function DashboardTable({
  panel,
  result,
  page,
  pageSize,
}: {
  panel: DashboardPanel;
  result: TablePage<DashboardRow>;
  page: number;
  pageSize: number;
}) {
  const copy = panelCopy[panel];
  const isReferralsPanel = panel === "referrals";
  const headers = isReferralsPanel
    ? ["Legajo", "Derivada / Por", "Resumen", "Origen / Destino", "Estado"]
    : ["Numero", "Carga / Reportado por", "Solicitante", "Categoria", "Prioridad / Estado"];

  return (
    <div className="mt-4">
      <Table
        title={copy.title}
        itemLabel={isReferralsPanel ? "derivaciones" : "registros"}
        total={result.total}
        page={page}
        pageSize={pageSize}
        showPagination
        headers={headers}
        empty={!result.rows.length}
      >
        {result.rows.map((row) => (
          <tr key={row.id}>
            <Td>
              <Link href={row.href} className="inline-flex whitespace-nowrap items-center gap-2 font-semibold text-[#0667b0] hover:text-[#0a61b9] hover:underline">
                {row.number}
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Td>
            <Td>
              <p className="font-semibold text-[#212529]">{formatDateTime(row.dateTime)}</p>
              <p className="mt-1 text-xs font-medium text-[#212529]">Reportado por: {row.reportedBy}</p>
            </Td>
            <Td>{row.requester}</Td>
            <Td>{row.category}</Td>
            <Td>
              {isReferralsPanel ? (
                <StatusBadge value={row.status} />
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center justify-center gap-2">
                    <span className="text-xs font-medium text-[#212529]">Prioridad:</span>
                    <StatusBadge value={row.priority} />
                  </div>
                  <div className="grid grid-cols-[minmax(54px,64px)_minmax(0,110px)] items-center justify-center gap-2">
                    <span className="text-xs font-medium text-[#212529]">Estado:</span>
                    <StatusBadge value={row.status} />
                  </div>
                </div>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      {!result.rows.length ? <p className="mt-2 text-sm font-medium text-[#212529]">{copy.empty}</p> : null}
    </div>
  );
}
