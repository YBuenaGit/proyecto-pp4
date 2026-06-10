import "server-only";

import type { Prisma } from "@prisma/client";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, ASSIGNED_AREAS, type AgendaViewScope } from "./appointment-constants";
import { canViewAppointment } from "./appointment-permissions";
import { ROLES } from "./constants";
import { prisma } from "./prisma";
import type { CurrentUser } from "./types";

export type AgendaUserOption = {
  id: string;
  name: string;
  role: string;
};

export type AppointmentWithRelations = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string | null;
  calendarScope: string;
  ownerUserId: string | null;
  createdByUserId: string;
  assignedUserId: string | null;
  assignedLawyerId: string | null;
  assignedArea: string | null;
  clientName: string | null;
  lawyerName: string | null;
  type: string;
  status: string;
  location: string | null;
  notes: string | null;
  caseId: string | null;
  caseTitle: string | null;
  expedienteNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  owner: AgendaUserOption | null;
  createdBy: AgendaUserOption | null;
  assignedUser: AgendaUserOption | null;
  assignedLawyer: AgendaUserOption | null;
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

const appointmentInclude = {
  owner: { select: { id: true, name: true, role: true } },
  createdBy: { select: { id: true, name: true, role: true } },
  assignedUser: { select: { id: true, name: true, role: true } },
  assignedLawyer: { select: { id: true, name: true, role: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentRecord = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

function rowToAppointment(record: AppointmentRecord): AppointmentWithRelations {
  return {
    id: record.id,
    title: record.title,
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
    calendarScope: record.calendarScope,
    ownerUserId: record.ownerUserId,
    createdByUserId: record.createdByUserId,
    assignedUserId: record.assignedUserId,
    assignedLawyerId: record.assignedLawyerId,
    assignedArea: record.assignedArea,
    clientName: record.clientName,
    lawyerName: record.lawyerName,
    type: record.type,
    status: record.status,
    location: record.location,
    notes: record.notes,
    caseId: record.caseId,
    caseTitle: record.caseTitle,
    expedienteNumber: record.expedienteNumber,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    owner: record.owner,
    createdBy: record.createdBy,
    assignedUser: record.assignedUser,
    assignedLawyer: record.assignedLawyer,
  };
}

function addSearchFilter(query: string): Prisma.AppointmentWhereInput {
  const contains = query.trim();
  return {
    OR: [
      { title: { contains, mode: "insensitive" } },
      { clientName: { contains, mode: "insensitive" } },
      { lawyerName: { contains, mode: "insensitive" } },
      { type: { contains, mode: "insensitive" } },
      { status: { contains, mode: "insensitive" } },
      { assignedArea: { contains, mode: "insensitive" } },
      { caseId: { contains, mode: "insensitive" } },
      { caseTitle: { contains, mode: "insensitive" } },
      { expedienteNumber: { contains, mode: "insensitive" } },
      { notes: { contains, mode: "insensitive" } },
      { location: { contains, mode: "insensitive" } },
      { assignedUser: { name: { contains, mode: "insensitive" } } },
      { assignedLawyer: { name: { contains, mode: "insensitive" } } },
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
  const where: Prisma.AppointmentWhereInput = {};

  if (filters.date) {
    where.date = filters.date;
  } else {
    where.date = { gte: input.monthStart, lte: input.monthEnd };
  }

  if (filters.type && (APPOINTMENT_TYPES as readonly string[]).includes(filters.type)) {
    where.type = filters.type;
  }
  if (filters.status && (APPOINTMENT_STATUSES as readonly string[]).includes(filters.status)) {
    where.status = filters.status;
  }
  if (filters.assignedLawyerId) where.assignedLawyerId = filters.assignedLawyerId;
  if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;
  if (filters.assignedArea && (ASSIGNED_AREAS as readonly string[]).includes(filters.assignedArea)) {
    where.assignedArea = filters.assignedArea;
  }
  if (input.viewScope !== "all") where.calendarScope = input.viewScope;
  if (filters.q) where.AND = [addSearchFilter(filters.q)];

  const rows = await prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return rows.map(rowToAppointment).filter((appointment) => canViewAppointment(input.user, appointment));
}

export async function getAppointmentById(id: string) {
  const row = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
  return row ? rowToAppointment(row) : null;
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
