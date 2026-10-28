import { personDisplayName } from "./text";

type Complainant = {
  isAnonymous: boolean;
  firstName: string | null;
  lastName: string | null;
  dni: string | null;
};

type RecordWithComplainants = {
  complainants: readonly Complainant[];
  complainantIsAnonymous?: boolean;
  complainantFirstName?: string | null;
  complainantLastName?: string | null;
  complainantDni?: string | null;
};

export function primaryComplainantDisplay(record: RecordWithComplainants) {
  // Older juridical records may only have the individual complainant fields.
  const complainant = record.complainants[0] ?? {
    isAnonymous: record.complainantIsAnonymous ?? false,
    firstName: record.complainantFirstName,
    lastName: record.complainantLastName,
    dni: record.complainantDni,
  };

  if (complainant.isAnonymous) {
    return { name: "Denunciante anónimo", dni: null };
  }

  return {
    name: personDisplayName(complainant.lastName, complainant.firstName) || "Sin denunciante identificado",
    dni: complainant.dni?.trim() || null,
  };
}
