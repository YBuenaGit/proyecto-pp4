import "server-only";

import type { Prisma } from "@prisma/client";
import {
  CALENDAR_SCOPE_LABELS,
  type CalendarScope,
} from "./appointment-constants";
import {
  CLOSED_APPOINTMENT_NOTIFICATION_STATUSES,
  isAppointmentNotificationActive,
} from "./appointment-notification-rules";
import { canAccessAgenda, getGroupCalendarScopes } from "./appointment-permissions";
import { parseArgentinaDateTime, toArgentinaDateKey } from "./argentina-time";
import { formatDateTime, labelFromValue } from "./format";
import { notificationDestinationModulesForUser, shouldRestrictDeadlineNotificationsToOwn } from "./notification-rules";
import { prisma } from "./prisma";
import { canAccessDispatch, canAccessExpedients, canAccessJuridical } from "./rbac";
import type { CurrentUser } from "./types";

export type NavbarNotification = {
  id: string;
  notificationKey: string;
  href: string;
  title: string;
  description: string;
  meta: string;
  kind: "agenda" | "deadline" | "referral";
  isRead: boolean;
  sortAt: Date;
};

export type NavbarNotificationPayload = {
  items: NavbarNotification[];
  total: number;
  unreadCount: number;
};

const activeReferralStatuses = ["PENDIENTE", "RECIBIDA", "EN_GESTION"];
const closedDispatchStatuses = ["ARCHIVADO", "CERRADO", "RESUELTO"];
const closedJuridicalStatuses = ["ARCHIVADO", "CONCLUIDO"];
const closedExpedientStatuses = ["APROBADO", "ARCHIVADO", "FINALIZADO"];

const emptyNotifications: NavbarNotificationPayload = { items: [], total: 0, unreadCount: 0 };

function truncate(value: string | null | undefined, max = 92) {
  if (!value) return "Sin detalle";
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function referralHref(referral: {
  destinationModule: string;
  originDispatchRecordId: string | null;
  originJuridicalInterventionId: string | null;
  destinationDispatchRecordId: string | null;
  destinationJuridicalInterventionId: string | null;
}) {
  if (referral.destinationModule === "DESPACHO" && referral.destinationDispatchRecordId) {
    return `/despacho/${referral.destinationDispatchRecordId}`;
  }
  if (referral.destinationModule === "JURIDICO" && referral.destinationJuridicalInterventionId) {
    return `/intervenciones/${referral.destinationJuridicalInterventionId}`;
  }
  if (referral.originDispatchRecordId) return `/despacho/${referral.originDispatchRecordId}`;
  if (referral.originJuridicalInterventionId) return `/intervenciones/${referral.originJuridicalInterventionId}`;
  return "/";
}

function moduleLabel(value: string) {
  const labels: Record<string, string> = {
    DESPACHO: "Despacho",
    JURIDICO: "Intervenciones",
    DIRECTIVO: "Directivo",
  };
  return labels[value] ?? labelFromValue(value);
}

export async function getNavbarNotifications(user: CurrentUser): Promise<NavbarNotificationPayload> {
  const now = new Date();
  const canSeeDispatch = canAccessDispatch(user);
  const canSeeJuridical = canAccessJuridical(user);
  const canSeeExpedients = canAccessExpedients(user);
  const canSeeAgenda = canAccessAgenda(user);
  const onlyOwnDeadlines = shouldRestrictDeadlineNotificationsToOwn();
  const destinationModules = notificationDestinationModulesForUser(user);
  const todayKey = toArgentinaDateKey(now);

  const dispatchRecordWhere = {
    deadlineAt: { lte: now },
    status: { notIn: closedDispatchStatuses },
    ...(onlyOwnDeadlines ? { createdById: user.id } : {}),
  };
  const dispatchFollowUpWhere = {
    deadlineAt: { lte: now },
    ...(onlyOwnDeadlines ? { createdById: user.id } : {}),
    dispatchRecord: { status: { notIn: closedDispatchStatuses } },
  };
  const juridicalWhere = {
    deadlineAt: { lte: now },
    status: { notIn: closedJuridicalStatuses },
    ...(onlyOwnDeadlines ? { createdById: user.id } : {}),
  };
  const juridicalActionWhere = {
    deadlineAt: { lte: now },
    ...(onlyOwnDeadlines ? { createdById: user.id } : {}),
    juridicalIntervention: { status: { notIn: closedJuridicalStatuses } },
  };
  const expedientWhere = {
    deadlineAt: { lte: now },
    status: { notIn: closedExpedientStatuses },
    ...(onlyOwnDeadlines ? { createdById: user.id } : {}),
  };
  const referralWhere = {
    destinationModule: { in: destinationModules },
    status: { in: activeReferralStatuses },
  };
  const groupCalendarScopes = getGroupCalendarScopes(user);
  const appointmentWhere: Prisma.AppointmentWhereInput = {
    date: { lte: todayKey },
    status: { notIn: [...CLOSED_APPOINTMENT_NOTIFICATION_STATUSES] },
    OR: [
      { calendarScope: "personal", ownerUserId: user.id },
      ...(groupCalendarScopes.length
        ? [{ calendarScope: { in: groupCalendarScopes } }]
        : []),
    ],
  };

  const [
    dispatchRecords,
    dispatchRecordTotal,
    dispatchFollowUps,
    dispatchFollowUpTotal,
    juridicalInterventions,
    juridicalInterventionTotal,
    juridicalActions,
    juridicalActionTotal,
    expedients,
    expedientTotal,
    referrals,
    referralTotal,
    appointments,
    appointmentTotal,
  ] = await Promise.all([
    canSeeDispatch
      ? prisma.dispatchRecord.findMany({
          where: dispatchRecordWhere,
          select: { id: true, internalNumber: true, deadlineAt: true, description: true },
          orderBy: { deadlineAt: "desc" },
          take: 50,
        })
      : [],
    canSeeDispatch ? prisma.dispatchRecord.count({ where: dispatchRecordWhere }) : 0,
    canSeeDispatch
      ? prisma.dispatchFollowUp.findMany({
          where: dispatchFollowUpWhere,
          select: {
            id: true,
            content: true,
            deadlineAt: true,
            dispatchRecord: { select: { id: true, internalNumber: true } },
          },
          orderBy: { deadlineAt: "desc" },
          take: 50,
        })
      : [],
    canSeeDispatch ? prisma.dispatchFollowUp.count({ where: dispatchFollowUpWhere }) : 0,
    canSeeJuridical
      ? prisma.juridicalIntervention.findMany({
          where: juridicalWhere,
          select: { id: true, internalNumber: true, deadlineAt: true, description: true },
          orderBy: { deadlineAt: "desc" },
          take: 50,
        })
      : [],
    canSeeJuridical ? prisma.juridicalIntervention.count({ where: juridicalWhere }) : 0,
    canSeeJuridical
      ? prisma.juridicalAction.findMany({
          where: juridicalActionWhere,
          select: {
            id: true,
            content: true,
            deadlineAt: true,
            juridicalIntervention: { select: { id: true, internalNumber: true } },
          },
          orderBy: { deadlineAt: "desc" },
          take: 50,
        })
      : [],
    canSeeJuridical ? prisma.juridicalAction.count({ where: juridicalActionWhere }) : 0,
    canSeeExpedients
      ? prisma.internalExpedient.findMany({
          where: expedientWhere,
          select: { id: true, internalNumber: true, deadlineAt: true, description: true },
          orderBy: { deadlineAt: "desc" },
          take: 50,
        })
      : [],
    canSeeExpedients ? prisma.internalExpedient.count({ where: expedientWhere }) : 0,
    destinationModules.length
      ? prisma.referral.findMany({
          where: referralWhere,
          select: {
            id: true,
            originModule: true,
            destinationModule: true,
            originDispatchRecordId: true,
            originJuridicalInterventionId: true,
            destinationDispatchRecordId: true,
            destinationJuridicalInterventionId: true,
            summary: true,
            referredAt: true,
            referredBy: { select: { name: true } },
          },
          orderBy: { referredAt: "desc" },
          take: 50,
        })
      : [],
    destinationModules.length ? prisma.referral.count({ where: referralWhere }) : 0,
    canSeeAgenda
      ? prisma.appointment.findMany({
          where: appointmentWhere,
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            calendarScope: true,
            status: true,
            clientName: true,
            location: true,
          },
          orderBy: [{ date: "desc" }, { startTime: "desc" }],
          take: 50,
        })
      : [],
    canSeeAgenda ? prisma.appointment.count({ where: appointmentWhere }) : 0,
  ]);

  const rawItems = [
    ...dispatchRecords.map((record) => ({
      id: `dispatch-${record.id}`,
      notificationKey: `deadline:dispatch-record:${record.id}:${record.deadlineAt?.toISOString() ?? ""}`,
      href: `/despacho/${record.id}`,
      title: `Plazo vencido: ${record.internalNumber}`,
      description: truncate(record.description),
      meta: `Plazo ${formatDateTime(record.deadlineAt)}`,
      kind: "deadline" as const,
      sortAt: record.deadlineAt ?? now,
    })),
    ...dispatchFollowUps.map((followUp) => ({
      id: `dispatch-followup-${followUp.id}`,
      notificationKey: `deadline:dispatch-followup:${followUp.id}:${followUp.deadlineAt?.toISOString() ?? ""}`,
      href: `/despacho/${followUp.dispatchRecord.id}`,
      title: `Plazo vencido: ${followUp.dispatchRecord.internalNumber}`,
      description: truncate(followUp.content),
      meta: `Intervencion con plazo ${formatDateTime(followUp.deadlineAt)}`,
      kind: "deadline" as const,
      sortAt: followUp.deadlineAt ?? now,
    })),
    ...juridicalInterventions.map((intervention) => ({
      id: `juridical-${intervention.id}`,
      notificationKey: `deadline:juridical-intervention:${intervention.id}:${intervention.deadlineAt?.toISOString() ?? ""}`,
      href: `/intervenciones/${intervention.id}`,
      title: `Plazo vencido: ${intervention.internalNumber}`,
      description: truncate(intervention.description),
      meta: `Plazo ${formatDateTime(intervention.deadlineAt)}`,
      kind: "deadline" as const,
      sortAt: intervention.deadlineAt ?? now,
    })),
    ...juridicalActions.map((action) => ({
      id: `juridical-action-${action.id}`,
      notificationKey: `deadline:juridical-action:${action.id}:${action.deadlineAt?.toISOString() ?? ""}`,
      href: `/intervenciones/${action.juridicalIntervention.id}`,
      title: `Plazo vencido: ${action.juridicalIntervention.internalNumber}`,
      description: truncate(action.content),
      meta: `Intervencion con plazo ${formatDateTime(action.deadlineAt)}`,
      kind: "deadline" as const,
      sortAt: action.deadlineAt ?? now,
    })),
    ...expedients.map((expedient) => ({
      id: `expedient-${expedient.id}`,
      notificationKey: `deadline:expedient:${expedient.id}:${expedient.deadlineAt?.toISOString() ?? ""}`,
      href: `/despacho/expedientes/${expedient.id}`,
      title: `Plazo vencido: ${expedient.internalNumber}`,
      description: truncate(expedient.description),
      meta: `Expediente interno - ${formatDateTime(expedient.deadlineAt)}`,
      kind: "deadline" as const,
      sortAt: expedient.deadlineAt ?? now,
    })),
    ...referrals.map((referral) => ({
      id: `referral-${referral.id}`,
      notificationKey: `referral:${referral.id}`,
      href: referralHref(referral),
      title: `Derivacion recibida`,
      description: truncate(referral.summary),
      meta: `${moduleLabel(referral.originModule)} -> ${moduleLabel(referral.destinationModule)} - ${formatDateTime(referral.referredAt)}`,
      kind: "referral" as const,
      sortAt: referral.referredAt,
    })),
    ...appointments
      .filter((appointment) =>
        isAppointmentNotificationActive({
          date: appointment.date,
          status: appointment.status,
          todayKey,
        }),
      )
      .map((appointment) => {
        const startsAt = parseArgentinaDateTime(`${appointment.date}T${appointment.startTime}`);
        const scope = appointment.calendarScope as CalendarScope;
        const scopeLabel = CALENDAR_SCOPE_LABELS[scope] ?? labelFromValue(appointment.calendarScope);
        const details = [appointment.clientName, appointment.location].filter(Boolean).join(" - ");

        return {
          id: `agenda-${appointment.id}`,
          notificationKey: `agenda:${appointment.id}:${appointment.date}:${appointment.startTime}`,
          href: `/agenda?scope=${appointment.calendarScope}&month=${appointment.date.slice(0, 7)}&day=${appointment.date}`,
          title: `Agenda: ${appointment.title}`,
          description: truncate(details || scopeLabel),
          meta: `${scopeLabel} - ${formatDateTime(startsAt)}`,
          kind: "agenda" as const,
          sortAt: startsAt,
        };
      }),
  ]
    .sort((a, b) => {
      return b.sortAt.getTime() - a.sortAt.getTime();
    })
    .slice(0, 60);

  const readRows = rawItems.length
    ? await prisma.notificationRead.findMany({
        where: {
          userId: user.id,
          notificationKey: { in: rawItems.map((item) => item.notificationKey) },
        },
        select: { notificationKey: true },
      })
    : [];
  const readKeys = new Set(readRows.map((row) => row.notificationKey));
  const items: NavbarNotification[] = rawItems.map((item) => ({
    ...item,
    isRead: readKeys.has(item.notificationKey),
  }));

  const total =
    dispatchRecordTotal +
    dispatchFollowUpTotal +
    juridicalInterventionTotal +
    juridicalActionTotal +
    expedientTotal +
    referralTotal +
    appointmentTotal;

  const unreadCount = items.filter((item) => !item.isRead).length;

  return total ? { items, total, unreadCount } : emptyNotifications;
}
