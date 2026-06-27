function cleanText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function capitalizeFirstLetter(value: string) {
  const trimmed = value.trim();
  return trimmed.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("es-AR"));
}

export function capitalizeOptionalText(value: string | null | undefined) {
  const cleaned = cleanText(value);
  return cleaned ? capitalizeFirstLetter(cleaned) : null;
}

export function personDisplayName(
  lastName: string | null | undefined,
  firstName: string | null | undefined,
) {
  return [capitalizeFirstLetter(lastName ?? ""), capitalizeFirstLetter(firstName ?? "")].filter(Boolean).join(" ");
}

function normalizedOptionLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

function isOtherOption(label: string) {
  return /^(otro|otra|otros|otras)(\b|$)/.test(normalizedOptionLabel(label));
}

export function compareOptionLabels(left: string, right: string) {
  const leftIsOther = isOtherOption(left);
  const rightIsOther = isOtherOption(right);
  if (leftIsOther !== rightIsOther) return leftIsOther ? 1 : -1;
  return left.localeCompare(right, "es", { sensitivity: "base", numeric: true });
}

export function sortByLabel<T>(items: readonly T[], getLabel: (item: T) => string) {
  return [...items].sort((left, right) => compareOptionLabels(getLabel(left), getLabel(right)));
}
