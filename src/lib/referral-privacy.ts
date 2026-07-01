export function earliestDate(dates: Iterable<Date | null | undefined>) {
  let earliest: Date | null = null;
  for (const date of dates) {
    if (!date) continue;
    if (!earliest || date.getTime() < earliest.getTime()) earliest = date;
  }
  return earliest;
}

export function isVisibleBeforeReferralCutoff<T extends { createdAt: Date }>(
  item: T,
  cutoffAt: Date | null,
  isDerivationEntry: (item: T) => boolean,
) {
  return !cutoffAt || item.createdAt.getTime() <= cutoffAt.getTime() || isDerivationEntry(item);
}
