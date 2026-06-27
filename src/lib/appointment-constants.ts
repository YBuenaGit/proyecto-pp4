export const CALENDAR_SCOPES = ["personal", "lawyers", "dispatch"] as const;
export const AGENDA_VIEW_SCOPES = ["personal", "lawyers", "dispatch", "all"] as const;

export type CalendarScope = (typeof CALENDAR_SCOPES)[number];
export type AgendaViewScope = (typeof AGENDA_VIEW_SCOPES)[number];

export const CALENDAR_SCOPE_LABELS: Record<AgendaViewScope, string> = {
  personal: "Mi agenda",
  lawyers: "Agenda abogados",
  dispatch: "Agenda despacho",
  all: "Todas",
};

export const CALENDAR_SCOPE_BADGE_CLASS: Record<CalendarScope, string> = {
  personal: "bg-slate-100 text-slate-700 ring-slate-200",
  lawyers: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  dispatch: "bg-cyan-50 text-cyan-800 ring-cyan-200",
};

export const APPOINTMENT_TYPES = [
  "AUDIENCIA",
  "CONSULTA",
  "FIRMA_DOCUMENTACION",
  "GESTION_DOCUMENTAL",
  "LLAMADA",
  "MEDIACION",
  "RECORDATORIO",
  "REUNION",
  "TAREA_ADMINISTRATIVA",
  "VENCIMIENTO",
  "OTRO",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  CONSULTA: "Consulta",
  AUDIENCIA: "Audiencia",
  VENCIMIENTO: "Vencimiento",
  REUNION: "Reunion",
  MEDIACION: "Mediacion",
  FIRMA_DOCUMENTACION: "Firma de documentacion",
  LLAMADA: "Llamada",
  TAREA_ADMINISTRATIVA: "Tarea administrativa",
  GESTION_DOCUMENTAL: "Gestion documental",
  RECORDATORIO: "Recordatorio",
  OTRO: "Otro",
};

export const APPOINTMENT_TYPE_TONES: Record<AppointmentType, string> = {
  CONSULTA: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  AUDIENCIA: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  VENCIMIENTO: "bg-orange-50 text-orange-800 ring-orange-200",
  REUNION: "bg-sky-50 text-sky-800 ring-sky-200",
  MEDIACION: "bg-violet-50 text-violet-800 ring-violet-200",
  FIRMA_DOCUMENTACION: "bg-teal-50 text-teal-800 ring-teal-200",
  LLAMADA: "bg-blue-50 text-blue-800 ring-blue-200",
  TAREA_ADMINISTRATIVA: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  GESTION_DOCUMENTAL: "bg-slate-100 text-slate-700 ring-slate-200",
  RECORDATORIO: "bg-amber-50 text-amber-800 ring-amber-200",
  OTRO: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

export const APPOINTMENT_STATUSES = ["CANCELADA", "CONFIRMADA", "FINALIZADA", "PENDIENTE", "REPROGRAMADA"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  FINALIZADA: "Finalizada",
  REPROGRAMADA: "Reprogramada",
};

export const APPOINTMENT_STATUS_TONES: Record<AppointmentStatus, string> = {
  PENDIENTE: "bg-amber-50 text-amber-800 ring-amber-200",
  CONFIRMADA: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELADA: "bg-rose-50 text-rose-800 ring-rose-200",
  FINALIZADA: "bg-slate-100 text-slate-700 ring-slate-200",
  REPROGRAMADA: "bg-blue-50 text-blue-800 ring-blue-200",
};

export const ASSIGNED_AREAS = ["lawyers", "dispatch"] as const;
export type AssignedArea = (typeof ASSIGNED_AREAS)[number];

export const ASSIGNED_AREA_LABELS: Record<AssignedArea, string> = {
  lawyers: "Abogados",
  dispatch: "Despacho",
};
