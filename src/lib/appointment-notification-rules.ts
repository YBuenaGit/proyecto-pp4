import { isArgentinaDateKey } from "./argentina-time";

export const CLOSED_APPOINTMENT_NOTIFICATION_STATUSES = ["CANCELADA", "FINALIZADA"] as const;

export function isAppointmentNotificationActive(input: {
  date: string;
  status: string;
  todayKey: string;
}) {
  if (!isArgentinaDateKey(input.date) || !isArgentinaDateKey(input.todayKey)) return false;
  if ((CLOSED_APPOINTMENT_NOTIFICATION_STATUSES as readonly string[]).includes(input.status)) return false;
  return input.date <= input.todayKey;
}
