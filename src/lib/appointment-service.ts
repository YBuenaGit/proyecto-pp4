import "server-only";

import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, ASSIGNED_AREAS, type AgendaViewScope } from "./appointment-constants";
import { canViewAppointment } from "./appointment-permissions";
import { ROLES } from "./constants";
import { sqliteQuery, sqliteQueryOne, type SqliteParam } from "./sqlite";
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
  createdAt: number | string;
  updatedAt: number | string;
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

type AppointmentRow = Omit<
  AppointmentWithRelations,
  "owner" | "createdBy" | "assignedUser" | "assignedLawyer"
> & {
  ownerId: string | null;
  ownerName: string | null;
  ownerRole: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  assignedUserRelationId: string | null;
  assignedUserName: string | null;
  assignedUserRole: string | null;
  assignedLawyerRelationId: string | null;
  assignedLawyerName: string | null;
  assignedLawyerRole: string | null;
};

const appointmentSelect = `
  SELECT
    a.id,
    a.title,
    a.date,
    a.startTime,
    a.endTime,
    a.calendarScope,
    a.ownerUserId,
    a.createdByUserId,
    a.assignedUserId,
    a.assignedLawyerId,
    a.assignedArea,
    a.clientName,
    a.lawyerName,
    a.type,
    a.status,
    a.location,
    a.notes,
    a.caseId,
    a.caseTitle,
    a.expedienteNumber,
    a.createdAt,
    a.updatedAt,
    owner.id AS ownerId,
    owner.name AS ownerName,
    owner.role AS ownerRole,
    createdBy.id AS createdById,
    createdBy.name AS createdByName,
    createdBy.role AS createdByRole,
    assignedUser.id AS assignedUserRelationId,
    assignedUser.name AS assignedUserName,
    assignedUser.role AS assignedUserRole,
    assignedLawyer.id AS assignedLawyerRelationId,
    assignedLawyer.name AS assignedLawyerName,
    assignedLawyer.role AS assignedLawyerRole
  FROM Appointment a
  LEFT JOIN User owner ON owner.id = a.ownerUserId
  LEFT JOIN User createdBy ON createdBy.id = a.createdByUserId
  LEFT JOIN User assignedUser ON assignedUser.id = a.assignedUserId
  LEFT JOIN User assignedLawyer ON assignedLawyer.id = a.assignedLawyerId
`;

function relation(id: string | null, name: string | null, role: string | null): AgendaUserOption | null {
  return id && name && role ? { id, name, role } : null;
}

function rowToAppointment(row: AppointmentRow): AppointmentWithRelations {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    calendarScope: row.calendarScope,
    ownerUserId: row.ownerUserId,
    createdByUserId: row.createdByUserId,
    assignedUserId: row.assignedUserId,
    assignedLawyerId: row.assignedLawyerId,
    assignedArea: row.assignedArea,
    clientName: row.clientName,
    lawyerName: row.lawyerName,
    type: row.type,
    status: row.status,
    location: row.location,
    notes: row.notes,
    caseId: row.caseId,
    caseTitle: row.caseTitle,
    expedienteNumber: row.expedienteNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    owner: relation(row.ownerId, row.ownerName, row.ownerRole),
    createdBy: relation(row.createdById, row.createdByName, row.createdByRole),
    assignedUser: relation(row.assignedUserRelationId, row.assignedUserName, row.assignedUserRole),
    assignedLawyer: relation(row.assignedLawyerRelationId, row.assignedLawyerName, row.assignedLawyerRole),
  };
}

function addFilter(filters: string[], params: SqliteParam[], condition: string, ...values: SqliteParam[]) {
  filters.push(condition);
  params.push(...values);
}

function addSearchFilter(filters: string[], params: SqliteParam[], query: string) {
  const like = `%${query.toLowerCase()}%`;
  const columns = [
    "a.title",
    "a.clientName",
    "a.lawyerName",
    "a.type",
    "a.status",
    "a.assignedArea",
    "a.caseId",
    "a.caseTitle",
    "a.expedienteNumber",
    "a.notes",
    "a.location",
    "assignedUser.name",
    "assignedLawyer.name",
  ];

  filters.push(`(${columns.map((column) => `LOWER(COALESCE(${column}, '')) LIKE ?`).join(" OR ")})`);
  params.push(...columns.map(() => like));
}

export async function getVisibleAppointments(input: {
  user: CurrentUser;
  viewScope: AgendaViewScope;
  monthStart: string;
  monthEnd: string;
  filters?: AgendaFilters;
}) {
  const filters = input.filters ?? {};
  const where: string[] = [];
  const params: SqliteParam[] = [];

  if (filters.date) {
    addFilter(where, params, "a.date = ?", filters.date);
  } else {
    addFilter(where, params, "a.date >= ? AND a.date <= ?", input.monthStart, input.monthEnd);
  }

  if (filters.q) addSearchFilter(where, params, filters.q);
  if (filters.type && (APPOINTMENT_TYPES as readonly string[]).includes(filters.type)) {
    addFilter(where, params, "a.type = ?", filters.type);
  }
  if (filters.status && (APPOINTMENT_STATUSES as readonly string[]).includes(filters.status)) {
    addFilter(where, params, "a.status = ?", filters.status);
  }
  if (filters.assignedLawyerId) addFilter(where, params, "a.assignedLawyerId = ?", filters.assignedLawyerId);
  if (filters.assignedUserId) addFilter(where, params, "a.assignedUserId = ?", filters.assignedUserId);
  if (filters.assignedArea && (ASSIGNED_AREAS as readonly string[]).includes(filters.assignedArea)) {
    addFilter(where, params, "a.assignedArea = ?", filters.assignedArea);
  }
  if (input.viewScope !== "all") addFilter(where, params, "a.calendarScope = ?", input.viewScope);

  const rows = await sqliteQuery<AppointmentRow>(
    `${appointmentSelect}
     WHERE ${where.join(" AND ")}
     ORDER BY a.date ASC, a.startTime ASC`,
    params,
  );

  return rows.map(rowToAppointment).filter((appointment) => canViewAppointment(input.user, appointment));
}

export async function getAppointmentById(id: string) {
  const row = await sqliteQueryOne<AppointmentRow>(`${appointmentSelect} WHERE a.id = ? LIMIT 1`, [id]);
  return row ? rowToAppointment(row) : null;
}

export async function getAgendaUserOptions() {
  const users = await sqliteQuery<AgendaUserOption>(
    `SELECT id, name, role
     FROM User
     WHERE active = 1
       AND role IN (?, ?, ?)
     ORDER BY role ASC, name ASC`,
    [ROLES.juridico, ROLES.despacho, ROLES.directivo],
  );

  return {
    users,
    lawyers: users.filter((user) => user.role === ROLES.juridico),
  };
}
