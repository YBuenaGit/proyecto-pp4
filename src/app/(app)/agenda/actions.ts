"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { optionalText, text } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { assertAccess } from "@/lib/rbac";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  ASSIGNED_AREAS,
  CALENDAR_SCOPES,
  type CalendarScope,
} from "@/lib/appointment-constants";
import {
  canCreateAppointment,
  canDeleteAppointment,
  canEditAppointment,
  isCalendarScope,
} from "@/lib/appointment-permissions";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const appointmentSchema = z.object({
  title: z.string().min(3),
  date: z.string().regex(dateRegex),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex).optional().nullable(),
  calendarScope: z.enum(CALENDAR_SCOPES),
  assignedUserId: z.string().optional().nullable(),
  assignedLawyerId: z.string().optional().nullable(),
  assignedArea: z.enum(ASSIGNED_AREAS).optional().nullable(),
  clientName: z.string().optional().nullable(),
  type: z.enum(APPOINTMENT_TYPES),
  status: z.enum(APPOINTMENT_STATUSES),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  caseId: z.string().optional().nullable(),
  caseTitle: z.string().optional().nullable(),
  expedienteNumber: z.string().optional().nullable(),
});

function agendaRedirect(scope: CalendarScope, date: string) {
  redirect(`/agenda?scope=${scope}&month=${date.slice(0, 7)}&day=${date}`);
}

async function activeUserOrNull(userId: string | null | undefined, role?: string) {
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, active: true, ...(role ? { role } : {}) },
    select: { id: true, name: true },
  });
  assertAccess(Boolean(user));
  return user;
}

async function parseAppointmentForm(formData: FormData) {
  const parsed = appointmentSchema.parse({
    title: text(formData, "title"),
    date: text(formData, "date"),
    startTime: text(formData, "startTime"),
    endTime: optionalText(formData, "endTime"),
    calendarScope: text(formData, "calendarScope"),
    assignedUserId: optionalText(formData, "assignedUserId"),
    assignedLawyerId: optionalText(formData, "assignedLawyerId"),
    assignedArea: optionalText(formData, "assignedArea"),
    clientName: optionalText(formData, "clientName"),
    type: text(formData, "type"),
    status: text(formData, "status") || "PENDIENTE",
    location: optionalText(formData, "location"),
    notes: optionalText(formData, "notes"),
    caseId: optionalText(formData, "caseId"),
    caseTitle: optionalText(formData, "caseTitle"),
    expedienteNumber: optionalText(formData, "expedienteNumber"),
  });

  if (parsed.endTime && parsed.endTime <= parsed.startTime) {
    throw new Error("La hora de fin debe ser posterior a la hora de inicio.");
  }

  const [assignedUser, assignedLawyer] = await Promise.all([
    activeUserOrNull(parsed.assignedUserId),
    activeUserOrNull(parsed.assignedLawyerId, "juridico"),
  ]);

  return {
    ...parsed,
    assignedUserId: assignedUser?.id ?? null,
    assignedLawyerId: assignedLawyer?.id ?? null,
    lawyerName: assignedLawyer?.name ?? null,
  };
}

export async function createAppointment(formData: FormData) {
  const user = await requireUser();
  const parsed = await parseAppointmentForm(formData);
  assertAccess(canCreateAppointment(user, parsed.calendarScope));

  const appointment = await prisma.appointment.create({
    data: {
      title: parsed.title,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      calendarScope: parsed.calendarScope,
      ownerUserId: parsed.calendarScope === "personal" ? user.id : null,
      createdByUserId: user.id,
      assignedUserId: parsed.assignedUserId,
      assignedLawyerId: parsed.assignedLawyerId,
      assignedArea: parsed.assignedArea,
      clientName: parsed.clientName,
      lawyerName: parsed.lawyerName,
      type: parsed.type,
      status: parsed.status,
      location: parsed.location,
      notes: parsed.notes,
      caseId: parsed.caseId,
      caseTitle: parsed.caseTitle,
      expedienteNumber: parsed.expedienteNumber,
    },
  });

  await writeAuditLog({
    module: "AGENDA",
    entityType: "Appointment",
    entityId: appointment.id,
    action: "CREATE",
    createdById: user.id,
    after: appointment,
  });

  revalidatePath("/agenda");
  agendaRedirect(parsed.calendarScope, parsed.date);
}

export async function updateAppointment(appointmentId: string, formData: FormData) {
  const user = await requireUser();
  const before = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  assertAccess(canEditAppointment(user, before));

  const parsed = await parseAppointmentForm(formData);
  assertAccess(canCreateAppointment(user, parsed.calendarScope));

  const after = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      title: parsed.title,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      calendarScope: parsed.calendarScope,
      ownerUserId: parsed.calendarScope === "personal" ? before.ownerUserId ?? user.id : null,
      assignedUserId: parsed.assignedUserId,
      assignedLawyerId: parsed.assignedLawyerId,
      assignedArea: parsed.assignedArea,
      clientName: parsed.clientName,
      lawyerName: parsed.lawyerName,
      type: parsed.type,
      status: parsed.status,
      location: parsed.location,
      notes: parsed.notes,
      caseId: parsed.caseId,
      caseTitle: parsed.caseTitle,
      expedienteNumber: parsed.expedienteNumber,
    },
  });

  await writeAuditLog({
    module: "AGENDA",
    entityType: "Appointment",
    entityId: appointmentId,
    action: before.status !== after.status ? "STATUS_CHANGE" : "UPDATE",
    createdById: user.id,
    before,
    after,
  });

  revalidatePath("/agenda");
  agendaRedirect(parsed.calendarScope, parsed.date);
}

export async function cancelAppointment(appointmentId: string) {
  const user = await requireUser();
  const before = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  assertAccess(canEditAppointment(user, before));

  const after = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELADA" },
  });

  await writeAuditLog({
    module: "AGENDA",
    entityType: "Appointment",
    entityId: appointmentId,
    action: "STATUS_CHANGE",
    createdById: user.id,
    before,
    after,
  });

  revalidatePath("/agenda");
  if (isCalendarScope(after.calendarScope)) agendaRedirect(after.calendarScope, after.date);
  redirect("/agenda");
}

export async function deleteAppointment(appointmentId: string) {
  const user = await requireUser();
  const before = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  assertAccess(canDeleteAppointment(user, before));

  await prisma.appointment.delete({ where: { id: appointmentId } });
  await writeAuditLog({
    module: "AGENDA",
    entityType: "Appointment",
    entityId: appointmentId,
    action: "DELETE",
    createdById: user.id,
    before,
  });

  revalidatePath("/agenda");
  if (isCalendarScope(before.calendarScope)) agendaRedirect(before.calendarScope, before.date);
  redirect("/agenda");
}
