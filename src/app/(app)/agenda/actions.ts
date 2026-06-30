"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getAppointmentById } from "@/lib/appointment-service";
import { writeAuditLog } from "@/lib/audit";
import { optionalSentenceText, sentenceText, text } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { assertAccess } from "@/lib/rbac";
import {
  APPOINTMENT_TYPES,
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
  calendarScope: z.enum(CALENDAR_SCOPES),
  clientName: z.string().optional().nullable(),
  type: z.enum(APPOINTMENT_TYPES),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function agendaRedirect(scope: CalendarScope, date: string) {
  redirect(`/agenda?scope=${scope}&month=${date.slice(0, 7)}&day=${date}`);
}

async function appointmentOrNotFound(appointmentId: string) {
  const appointment = await getAppointmentById(appointmentId);
  assertAccess(Boolean(appointment));
  return appointment!;
}

async function parseAppointmentForm(formData: FormData) {
  const parsed = appointmentSchema.parse({
    title: sentenceText(formData, "title"),
    date: text(formData, "date"),
    startTime: text(formData, "startTime"),
    calendarScope: text(formData, "calendarScope"),
    clientName: optionalSentenceText(formData, "clientName"),
    type: text(formData, "type"),
    location: optionalSentenceText(formData, "location"),
    notes: optionalSentenceText(formData, "notes"),
  });

  return {
    title: parsed.title,
    date: parsed.date,
    startTime: parsed.startTime,
    calendarScope: parsed.calendarScope,
    clientName: parsed.clientName ?? null,
    type: parsed.type,
    location: parsed.location ?? null,
    notes: parsed.notes ?? null,
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
      endTime: null,
      calendarScope: parsed.calendarScope,
      ownerUserId: parsed.calendarScope === "personal" ? user.id : null,
      createdByUserId: user.id,
      assignedUserId: null,
      assignedLawyerId: null,
      assignedArea: null,
      clientName: parsed.clientName,
      lawyerName: null,
      type: parsed.type,
      status: "PENDIENTE",
      location: parsed.location,
      notes: parsed.notes,
      caseId: null,
      caseTitle: null,
      expedienteNumber: null,
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
  const before = await appointmentOrNotFound(appointmentId);
  assertAccess(canEditAppointment(user, before));

  const parsed = await parseAppointmentForm(formData);
  assertAccess(canCreateAppointment(user, parsed.calendarScope));

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      title: parsed.title,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: null,
      calendarScope: parsed.calendarScope,
      ownerUserId: parsed.calendarScope === "personal" ? before.ownerUserId ?? user.id : null,
      assignedUserId: null,
      assignedLawyerId: null,
      assignedArea: null,
      clientName: parsed.clientName,
      lawyerName: null,
      type: parsed.type,
      location: parsed.location,
      notes: parsed.notes,
      caseId: null,
      caseTitle: null,
      expedienteNumber: null,
    },
  });

  const after = await appointmentOrNotFound(appointmentId);

  await writeAuditLog({
    module: "AGENDA",
    entityType: "Appointment",
    entityId: appointmentId,
    action: "UPDATE",
    createdById: user.id,
    before,
    after,
  });

  revalidatePath("/agenda");
  agendaRedirect(parsed.calendarScope, parsed.date);
}

export async function deleteAppointment(appointmentId: string) {
  const user = await requireUser();
  const before = await appointmentOrNotFound(appointmentId);
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
