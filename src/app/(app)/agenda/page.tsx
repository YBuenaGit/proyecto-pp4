import { Plus, RefreshCw } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
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
import { getVisibleAppointments, type AgendaFilters } from "@/lib/appointment-service";
import { createAppointment } from "./actions";
import { AgendaScopeTabs } from "./components/agenda-scope-tabs";
import { AppointmentFilters } from "./components/appointment-filters";
import { AppointmentForm } from "./components/appointment-form";
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
    type: input.filters.type,
    dateFrom: input.filters.dateFrom,
    dateTo: input.filters.dateTo,
  };
}

export default async function AgendaPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessAgenda(user));

  const params = searchParams ? await searchParams : {};
  const todayKey = toDateKey(new Date());
  const requestedDate = cleanParam(param(params, "date"));
  const requestedDateFrom = cleanParam(param(params, "dateFrom"));
  const requestedDateTo = cleanParam(param(params, "dateTo"));
  const requestedMonth = cleanParam(param(params, "month"));
  const requestedDay = cleanParam(param(params, "day"));
  const activeScope = normalizeAgendaViewScope(user, cleanParam(param(params, "scope")));
  const dateFrom = isDateKey(requestedDateFrom) ? requestedDateFrom : undefined;
  const dateTo = isDateKey(requestedDateTo) ? requestedDateTo : undefined;

  const monthKey = isDateKey(requestedDate)
    ? requestedDate.slice(0, 7)
    : isMonthKey(requestedMonth)
      ? requestedMonth
      : dateFrom
        ? dateFrom.slice(0, 7)
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
    type: cleanParam(param(params, "type")),
    dateFrom,
    dateTo,
  };

  const allowedScopes = getAllowedCalendarScopes(user);
  const viewScopes = getAllowedAgendaViewScopes(user);
  const monthRange = getMonthRange(monthKey);
  const query = buildQueryValues({ scope: activeScope, month: monthKey, day: selectedDay, filters });
  const resetHref = agendaHref(query, {
    month: todayKey.slice(0, 7),
    day: todayKey,
    q: undefined,
    type: undefined,
    date: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  const appointments = await getVisibleAppointments({
    user,
    viewScope: activeScope,
    monthStart: monthRange.monthStart,
    monthEnd: monthRange.monthEnd,
    filters,
  });

  const selectedDayAppointments = appointments
    .filter((appointment) => appointment.date === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        breadcrumbs={[{ label: "Anuncios importantes", href: "/" }, { label: "Agenda" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2 rounded-sm border border-[#dee2e6] bg-white p-2 shadow-sm">
            <AppointmentFilters
              scopes={viewScopes}
              activeScope={activeScope}
              monthKey={monthKey}
              selectedDay={selectedDay}
              filters={filters}
              resetHref={resetHref}
            />
            <AppModal
              title="Nueva cita"
              trigger={<><Plus className="h-4 w-4" />Nueva cita</>}
              size="lg"
            >
              <AppointmentForm
                action={createAppointment}
                allowedScopes={allowedScopes}
                defaultDate={selectedDay}
                modal
              />
            </AppModal>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AgendaScopeTabs scopes={viewScopes} activeScope={activeScope} query={query} />
          <LinkButton href={resetHref} variant="secondary" className="bg-white shadow-none">
            <RefreshCw className="h-4 w-4" />
            Limpiar
          </LinkButton>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_350px]">
        <div>
          <CalendarMonthView
            monthKey={monthKey}
            selectedDay={selectedDay}
            todayKey={todayKey}
            appointments={appointments}
            query={query}
          />
        </div>
        <div>
          <DayAgendaPanel
            dateKey={selectedDay}
            appointments={selectedDayAppointments}
            user={user}
            allowedScopes={allowedScopes}
          />
        </div>
      </div>
    </div>
  );
}
