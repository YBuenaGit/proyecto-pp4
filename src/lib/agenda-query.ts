export type AgendaQueryValues = Record<string, string | undefined>;

export function agendaHref(current: AgendaQueryValues, overrides: AgendaQueryValues = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return query ? `/agenda?${query}` : "/agenda";
}
