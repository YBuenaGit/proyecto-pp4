import { CalendarPlus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { agendaHref, type AgendaQueryValues } from "@/lib/agenda-query";
import {
  firstDayOfMonth,
  getMonthRange,
  isDateKey,
  isMonthKey,
  toDateKey,
  toMonthKey,
} from "@/lib/agenda-dates";
import { requireUser } from "@/lib/auth";
import { assertAccess } from "@/lib/rbac";
import { param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";
import {
  canAccessAgenda,
  getAllowedAgendaViewScopes,
  getAllowedCalendarScopes,
  normalizeAgendaViewScope,
} from "@/lib/appointment-permissions";
import { getAgendaUserOptions, getVisibleAppointments, type AgendaFilters } from "@/lib/appointment-service";
import { createAppointment } from "./actions";
import { AgendaScopeTabs } from "./components/agenda-scope-tabs";
import { AppointmentFilters } from "./components/appointment-filters";
import { AppointmentForm } from "./components/appointment-form";
import { AppointmentTypeLegend } from "./components/appointment-type-legend";
import { CalendarMonthView } from "./components/calendar-month-view";
import { DayAgendaPanel } from "./components/day-agenda-panel";

function cleanParam(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildQueryValues(input: {
  scope: string;
  month: string;
  day: string;
  filters: AgendaFilters;
}): AgendaQueryValues {
  return {
    scope: input.scope,
    month: input.month,
    day: input.day,
    q: input.filters.q,
    type: input.filters.type,
    status: input.filters.status,
    assignedLawyerId: input.filters.assignedLawyerId,
    assignedUserId: input.filters.assignedUserId,
    assignedArea: input.filters.assignedArea,
    date: input.filters.date,
  };
}

export default async function AgendaPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessAgenda(user));

  const params = searchParams ? await searchParams : {};
  const todayKey = toDateKey(new Date());
  const requestedDate = cleanParam(param(params, "date"));
  const requestedMonth = cleanParam(param(params, "month"));
  const requestedDay = cleanParam(param(params, "day"));
  const activeScope = normalizeAgendaViewScope(user, cleanParam(param(params, "scope")));

  const monthKey = isDateKey(requestedDate)
    ? requestedDate.slice(0, 7)
    : isMonthKey(requestedMonth)
      ? requestedMonth
      : toMonthKey(new Date());
  const selectedDay =
    isDateKey(requestedDate)
      ? requestedDate
      : isDateKey(requestedDay) && requestedDay.startsWith(monthKey)
        ? requestedDay
        : todayKey.startsWith(monthKey)
          ? todayKey
          : firstDayOfMonth(monthKey);

  const filters: AgendaFilters = {
    q: cleanParam(param(params, "q")),
    type: cleanParam(param(params, "type")),
    status: cleanParam(param(params, "status")),
    assignedLawyerId: cleanParam(param(params, "assignedLawyerId")),
    assignedUserId: cleanParam(param(params, "assignedUserId")),
    assignedArea: cleanParam(param(params, "assignedArea")),
    date: isDateKey(requestedDate) ? requestedDate : undefined,
  };

  const allowedScopes = getAllowedCalendarScopes(user);
  const viewScopes = getAllowedAgendaViewScopes(user);
  const monthRange = getMonthRange(monthKey);
  const query = buildQueryValues({ scope: activeScope, month: monthKey, day: selectedDay, filters });

  const [appointments, agendaUsers] = await Promise.all([
    getVisibleAppointments({
      user,
      viewScope: activeScope,
      monthStart: monthRange.monthStart,
      monthEnd: monthRange.monthEnd,
      filters,
    }),
    getAgendaUserOptions(),
  ]);

  const selectedDayAppointments = appointments
    .filter((appointment) => appointment.date === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Calendario mensual de citas, vencimientos, reuniones y tareas con visibilidad por rol."
        actions={
          <LinkButton href={agendaHref(query, {}) + "#nueva-cita"}>
            <CalendarPlus className="h-4 w-4" />
            Nueva cita
          </LinkButton>
        }
      />

      <AgendaScopeTabs scopes={viewScopes} activeScope={activeScope} query={query} />

      <AppointmentFilters
        scopes={viewScopes}
        activeScope={activeScope}
        monthKey={monthKey}
        selectedDay={selectedDay}
        filters={filters}
        users={agendaUsers.users}
        lawyers={agendaUsers.lawyers}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-5">
          <CalendarMonthView
            monthKey={monthKey}
            selectedDay={selectedDay}
            todayKey={todayKey}
            appointments={appointments}
            query={query}
          />
          <AppointmentTypeLegend />
        </div>
        <div className="space-y-5">
          <DayAgendaPanel
            dateKey={selectedDay}
            appointments={selectedDayAppointments}
            user={user}
            allowedScopes={allowedScopes}
            users={agendaUsers.users}
            lawyers={agendaUsers.lawyers}
          />
          <section id="nueva-cita" className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">Nueva cita</h2>
              <p className="mt-1 text-sm text-slate-500">La agenda destino define quien puede ver la cita.</p>
            </div>
            <div className="p-5">
              <AppointmentForm
                action={createAppointment}
                allowedScopes={allowedScopes}
                users={agendaUsers.users}
                lawyers={agendaUsers.lawyers}
                defaultDate={selectedDay}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
