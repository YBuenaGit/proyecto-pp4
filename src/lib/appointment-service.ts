import "server-only";

import type { Prisma } from "@prisma/client";
import { ROLES } from "./constants";
import { prisma } from "./prisma";
import type { CurrentUser } from "./types";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  ASSIGNED_AREAS,
  type AgendaViewScope,
} from "./appointment-constants";
import { canViewAppointment, isAgendaManager } from "./appointment-permissions";

const appointmentInclude = {
  owner: { select: { id: true, name: true, role: true } },
  createdBy: { select: { id: true, name: true, role: true } },
  assignedUser: { select: { id: true, name: true, role: true } },
  assignedLawyer: { select: { id: true, name: true, role: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

export type AgendaUserOption = {
  id: string;
  name: string;
  role: string;
};

export type AgendaFilters = {
  q?: string;
  type?: string;
  status?: string;
  assignedLawyerId?: string;
  assignedUserId?: string;
  assignedArea?: string;
  date?: string;
};

function noAccessWhere(): Prisma.AppointmentWhereInput {
  return { id: "__no_access__" };
}

function assignmentVisibilityWhere(user: CurrentUser): Prisma.AppointmentWhereInput[] {
  const filters: Prisma.AppointmentWhereInput[] = [
    { assignedUserId: user.id, NOT: { calendarScope: "personal" } },
    { assignedLawyerId: user.id, NOT: { calendarScope: "personal" } },
  ];

  if (user.role === ROLES.juridico) {
    filters.push({ assignedArea: "lawyers", NOT: { calendarScope: { in: ["personal", "lawyers"] } } });
  }
  if (user.role === ROLES.despacho) {
    filters.push({ assignedArea: "dispatch", NOT: { calendarScope: { in: ["personal", "dispatch"] } } });
  }

  return filters;
}

export function appointmentVisibilityWhere(user: CurrentUser, viewScope: AgendaViewScope): Prisma.AppointmentWhereInput {
  if (isAgendaManager(user)) {
    if (viewScope === "all") return {};
    if (viewScope === "personal") return { calendarScope: "personal", ownerUserId: user.id };
    return { calendarScope: viewScope };
  }

  if (viewScope === "personal") {
    return {
      OR: [{ calendarScope: "personal", ownerUserId: user.id }, ...assignmentVisibilityWhere(user)],
    };
  }

  if (viewScope === "lawyers" && user.role === ROLES.juridico) return { calendarScope: "lawyers" };
  if (viewScope === "dispatch" && user.role === ROLES.despacho) return { calendarScope: "dispatch" };

  return noAccessWhere();
}

function searchWhere(query: string): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { title: { contains: query } },
      { clientName: { contains: query } },
      { lawyerName: { contains: query } },
      { type: { contains: query } },
      { status: { contains: query } },
      { assignedArea: { contains: query } },
      { caseId: { contains: query } },
      { caseTitle: { contains: query } },
      { expedienteNumber: { contains: query } },
      { notes: { contains: query } },
      { location: { contains: query } },
      { assignedUser: { name: { contains: query } } },
      { assignedLawyer: { name: { contains: query } } },
    ],
  };
}

export async function getVisibleAppointments(input: {
  user: CurrentUser;
  viewScope: AgendaViewScope;
  monthStart: string;
  monthEnd: string;
  filters?: AgendaFilters;
}) {
  const filters = input.filters ?? {};
  const andFilters: Prisma.AppointmentWhereInput[] = [
    appointmentVisibilityWhere(input.user, input.viewScope),
    { date: { gte: input.monthStart, lte: input.monthEnd } },
  ];

  if (filters.date) andFilters.push({ date: filters.date });
  if (filters.q) andFilters.push(searchWhere(filters.q));
  if (filters.type && (APPOINTMENT_TYPES as readonly string[]).includes(filters.type)) {
    andFilters.push({ type: filters.type });
  }
  if (filters.status && (APPOINTMENT_STATUSES as readonly string[]).includes(filters.status)) {
    andFilters.push({ status: filters.status });
  }
  if (filters.assignedLawyerId) andFilters.push({ assignedLawyerId: filters.assignedLawyerId });
  if (filters.assignedUserId) andFilters.push({ assignedUserId: filters.assignedUserId });
  if (filters.assignedArea && (ASSIGNED_AREAS as readonly string[]).includes(filters.assignedArea)) {
    andFilters.push({ assignedArea: filters.assignedArea });
  }

  const appointments = await prisma.appointment.findMany({
    where: { AND: andFilters },
    include: appointmentInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return appointments.filter((appointment) => canViewAppointment(input.user, appointment));
}

export async function getAgendaUserOptions() {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: [ROLES.juridico, ROLES.despacho, ROLES.directivo] },
    },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return {
    users,
    lawyers: users.filter((user) => user.role === ROLES.juridico),
  };
}
