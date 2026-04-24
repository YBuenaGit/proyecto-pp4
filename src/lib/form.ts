import { randomUUID } from "node:crypto";
import { normalizeName } from "./format";
import { sqliteExecute, sqliteNow, sqliteQueryOne } from "./sqlite";

type ExternalPersonFormResult = {
  id: string;
  dni: string | null;
  firstName: string;
  lastName: string;
};

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
    const existing = await sqliteQueryOne<{ id: string }>("SELECT id FROM ExternalPerson WHERE dni = ? LIMIT 1", [dni]);
    if (existing) {
      await sqliteExecute(
        `UPDATE ExternalPerson
         SET firstName = ?, lastName = ?, fullNameNormalized = ?, phone1 = ?, phone2 = ?, address = ?, updatedAt = ?
         WHERE id = ?`,
        [safeFirstName, safeLastName, fullNameNormalized, phone1, phone2, address, sqliteNow(), existing.id],
      );
      return sqliteQueryOne<ExternalPersonFormResult>(
        "SELECT id, dni, firstName, lastName FROM ExternalPerson WHERE id = ? LIMIT 1",
        [existing.id],
      );
    }
  }

  const id = randomUUID();
  const now = sqliteNow();
  await sqliteExecute(
    `INSERT INTO ExternalPerson (
       id, dni, firstName, lastName, fullNameNormalized, phone1, phone2, address, createdAt, updatedAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dni, safeFirstName, safeLastName, fullNameNormalized, phone1, phone2, address, now, now],
  );
  return sqliteQueryOne<ExternalPersonFormResult>(
    "SELECT id, dni, firstName, lastName FROM ExternalPerson WHERE id = ? LIMIT 1",
    [id],
  );
}

export async function nextInternalNumber(prefix: string, model: "dispatch" | "juridical" | "expedient") {
  const year = new Date().getFullYear();
  const table =
    model === "dispatch"
      ? "DispatchRecord"
      : model === "juridical"
        ? "JuridicalIntervention"
        : "InternalExpedient";
  const row = await sqliteQueryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  const count = row?.count ?? 0;
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}
