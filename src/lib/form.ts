import { prisma } from "./prisma";
import { normalizeName } from "./format";

export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

export function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

export function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

export async function upsertPersonFromForm(formData: FormData) {
  const dni = optionalText(formData, "dni");
  const firstName = optionalText(formData, "firstName");
  const lastName = optionalText(formData, "lastName");
  const phone1 = optionalText(formData, "phone1");
  const phone2 = optionalText(formData, "phone2");
  const address = optionalText(formData, "address");

  if (!dni && !firstName && !lastName) return null;
  const safeFirstName = firstName || "Sin";
  const safeLastName = lastName || "Identificar";
  const fullNameNormalized = normalizeName(`${safeFirstName} ${safeLastName}`);

  if (dni) {
    return prisma.externalPerson.upsert({
      where: { dni },
      create: {
        dni,
        firstName: safeFirstName,
        lastName: safeLastName,
        fullNameNormalized,
        phone1,
        phone2,
        address,
      },
      update: {
        firstName: safeFirstName,
        lastName: safeLastName,
        fullNameNormalized,
        phone1,
        phone2,
        address,
      },
    });
  }

  return prisma.externalPerson.create({
    data: {
      firstName: safeFirstName,
      lastName: safeLastName,
      fullNameNormalized,
      phone1,
      phone2,
      address,
    },
  });
}

export async function nextInternalNumber(prefix: string, model: "dispatch" | "juridical" | "expedient") {
  const year = new Date().getFullYear();
  const count =
    model === "dispatch"
      ? await prisma.dispatchRecord.count()
      : model === "juridical"
        ? await prisma.juridicalIntervention.count()
        : await prisma.internalExpedient.count();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}
