import { ROLES } from "./constants";
import type { CurrentUser } from "./types";
import {
  AGENDA_VIEW_SCOPES,
  CALENDAR_SCOPES,
  type AgendaViewScope,
  type CalendarScope,
} from "./appointment-constants";

export type AppointmentPermissionShape = {
  calendarScope: string;
  ownerUserId?: string | null;
  createdByUserId: string;
  assignedUserId?: string | null;
  assignedLawyerId?: string | null;
  assignedArea?: string | null;
};

export function isAgendaManager(user: CurrentUser | null) {
  return user?.role === ROLES.directivo || user?.role === ROLES.admin;
}

export function canAccessAgenda(user: CurrentUser | null) {
  return user?.role === ROLES.juridico || user?.role === ROLES.despacho || isAgendaManager(user);
}

export function isCalendarScope(value: string | null | undefined): value is CalendarScope {
  return Boolean(value && (CALENDAR_SCOPES as readonly string[]).includes(value));
}

export function isAgendaViewScope(value: string | null | undefined): value is AgendaViewScope {
  return Boolean(value && (AGENDA_VIEW_SCOPES as readonly string[]).includes(value));
}

export function getAllowedCalendarScopes(user: CurrentUser): CalendarScope[] {
  if (user.role === ROLES.directivo) return ["personal", "directors", "lawyers", "dispatch"];
  if (user.role === ROLES.admin) return ["personal", "lawyers", "dispatch"];
  if (user.role === ROLES.juridico) return ["personal", "lawyers"];
  if (user.role === ROLES.despacho) return ["personal", "dispatch"];
  return [];
}

export function getGroupCalendarScopes(user: CurrentUser): CalendarScope[] {
  if (user.role === ROLES.directivo) return ["directors"];
  if (user.role === ROLES.juridico) return ["lawyers"];
  if (user.role === ROLES.despacho) return ["dispatch"];
  if (user.role === ROLES.admin) return ["lawyers", "dispatch"];
  return [];
}

export function getAllowedAgendaViewScopes(user: CurrentUser): AgendaViewScope[] {
  const scopes: AgendaViewScope[] = getAllowedCalendarScopes(user);
  return isAgendaManager(user) ? [...scopes, "all"] : scopes;
}

export function normalizeAgendaViewScope(user: CurrentUser, requested: string | null | undefined): AgendaViewScope {
  const allowed = getAllowedAgendaViewScopes(user);
  if (isAgendaViewScope(requested) && allowed.includes(requested)) return requested;
  return allowed[0] ?? "personal";
}

function isAssignedToUserOrArea(user: CurrentUser, appointment: AppointmentPermissionShape) {
  if (appointment.assignedUserId === user.id || appointment.assignedLawyerId === user.id) return true;
  if (user.role === ROLES.juridico && appointment.assignedArea === "lawyers") return true;
  if (user.role === ROLES.despacho && appointment.assignedArea === "dispatch") return true;
  return false;
}

export function canViewAppointment(user: CurrentUser | null, appointment: AppointmentPermissionShape) {
  if (!user) return false;
  if (appointment.calendarScope === "directors") return user.role === ROLES.directivo;
  if (isAgendaManager(user)) return true;

  if (appointment.calendarScope === "personal") {
    return appointment.ownerUserId === user.id;
  }

  if (appointment.calendarScope === "lawyers") {
    return user.role === ROLES.juridico || isAssignedToUserOrArea(user, appointment);
  }

  if (appointment.calendarScope === "dispatch") {
    return user.role === ROLES.despacho || isAssignedToUserOrArea(user, appointment);
  }

  return false;
}

export function canCreateAppointment(user: CurrentUser | null, calendarScope: CalendarScope) {
  if (!user) return false;
  return getAllowedCalendarScopes(user).includes(calendarScope);
}

export function canEditAppointment(user: CurrentUser | null, appointment: AppointmentPermissionShape) {
  if (!user || !canViewAppointment(user, appointment)) return false;
  if (isAgendaManager(user)) return true;
  if (appointment.calendarScope === "personal") return appointment.ownerUserId === user.id;
  return appointment.createdByUserId === user.id && canCreateAppointment(user, appointment.calendarScope as CalendarScope);
}

export function canDeleteAppointment(user: CurrentUser | null, appointment: AppointmentPermissionShape) {
  return canEditAppointment(user, appointment);
}
