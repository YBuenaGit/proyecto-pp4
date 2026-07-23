export type IntakeComplainant = {
  isAnonymous?: boolean;
  dni?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
};

export type IntakeLinkedPerson = {
  dni?: string | null;
  firstName?: string | null;
  apellidoApodoManual?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function hasIntakeComplainantData(person: IntakeComplainant) {
  return Boolean(
    person.isAnonymous ||
      hasText(person.dni) ||
      hasText(person.firstName) ||
      hasText(person.lastName) ||
      hasText(person.phone1) ||
      hasText(person.phone2) ||
      hasText(person.address),
  );
}

export function hasIntakeLinkedPersonData(person: IntakeLinkedPerson) {
  return Boolean(
    hasText(person.dni) ||
      hasText(person.firstName) ||
      hasText(person.apellidoApodoManual) ||
      hasText(person.phone1) ||
      hasText(person.phone2) ||
      hasText(person.address),
  );
}

export function hasIntakeComplainantResolution(
  complainants: readonly IntakeComplainant[],
) {
  return complainants.some(hasIntakeComplainantData);
}

export function hasIntakeLinkedPersonResolution(input: {
  linkedPersons: readonly IntakeLinkedPerson[];
  noLinkedPerson: boolean;
}) {
  return (
    input.noLinkedPerson ||
    input.linkedPersons.some(hasIntakeLinkedPersonData)
  );
}

export function hasIntakePeopleResolution(input: {
  complainants: readonly IntakeComplainant[];
  linkedPersons: readonly IntakeLinkedPerson[];
  noLinkedPerson: boolean;
}) {
  return (
    hasIntakeComplainantResolution(input.complainants) &&
    hasIntakeLinkedPersonResolution(input)
  );
}
