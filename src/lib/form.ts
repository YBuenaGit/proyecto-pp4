import { normalizeName } from "./format";
import { prisma } from "./prisma";
import { capitalizeFirstLetter, capitalizeOptionalText, personDisplayName } from "./text";

export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

export function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

export function sentenceText(formData: FormData, key: string) {
  return capitalizeFirstLetter(text(formData, key));
}

export function optionalSentenceText(formData: FormData, key: string) {
  return capitalizeOptionalText(optionalText(formData, key));
}

export function checkbox(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

export function complainantFromForm(formData: FormData) {
  const complainantIsAnonymous = checkbox(formData, "complainantIsAnonymous");

  if (complainantIsAnonymous) {
    return {
      complainantIsAnonymous,
      complainantDni: null,
      complainantFirstName: null,
      complainantLastName: null,
      complainantPhone1: null,
      complainantPhone2: null,
      complainantAddress: null,
    };
  }

  return {
    complainantIsAnonymous,
    complainantDni: optionalText(formData, "complainantDni"),
    complainantFirstName: optionalSentenceText(formData, "complainantFirstName"),
    complainantLastName: optionalSentenceText(formData, "complainantLastName"),
    complainantPhone1: optionalText(formData, "complainantPhone1"),
    complainantPhone2: optionalText(formData, "complainantPhone2"),
    complainantAddress: optionalSentenceText(formData, "complainantAddress"),
  };
}

export async function upsertPersonFromForm(formData: FormData) {
  const dni = optionalText(formData, "dni");
  const firstName = optionalSentenceText(formData, "firstName");
  const lastName = optionalSentenceText(formData, "lastName");
  const phone1 = optionalText(formData, "phone1");
  const phone2 = optionalText(formData, "phone2");
  const address = optionalSentenceText(formData, "address");

  if (!dni && !firstName && !lastName) return null;
  const safeFirstName = firstName || "Sin";
  const safeLastName = lastName || "Identificar";
  const fullNameNormalized = normalizeName(personDisplayName(safeLastName, safeFirstName));

  if (dni) {
    const existing = await prisma.externalPerson.findUnique({
      where: { dni },
      select: { id: true },
    });
    if (existing) {
      return prisma.externalPerson.update({
        where: { id: existing.id },
        data: { firstName: safeFirstName, lastName: safeLastName, fullNameNormalized, phone1, phone2, address },
        select: { id: true, dni: true, firstName: true, lastName: true },
      });
    }
  }

  return prisma.externalPerson.create({
    data: { dni, firstName: safeFirstName, lastName: safeLastName, fullNameNormalized, phone1, phone2, address },
    select: { id: true, dni: true, firstName: true, lastName: true },
  });
}

export async function nextInternalNumber(prefix: string, model: "dispatch" | "juridical" | "expedient" | "retention") {
  const year = new Date().getFullYear();
  const count =
    model === "dispatch"
      ? await prisma.dispatchRecord.count()
      : model === "juridical"
        ? await prisma.juridicalIntervention.count()
        : model === "expedient"
          ? await prisma.internalExpedient.count()
          : await prisma.retention.count();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}
