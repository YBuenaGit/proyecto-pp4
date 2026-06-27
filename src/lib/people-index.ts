import { Buffer } from "node:buffer";
import { normalizeName } from "./format";
import { prisma } from "./prisma";
import { personDisplayName } from "./text";

export type PeopleModule = "DESPACHO" | "JURIDICO";
export type PeopleRole = "DENUNCIANTE" | "DENUNCIADO_VINCULADO" | "REGISTRO";

export type PeopleCase = {
  module: PeopleModule;
  id: string;
  href: string;
  internalNumber: string;
  attendedAt: Date;
  kind: string;
  status: string;
  role: PeopleRole;
  createdByName: string;
  searchText: string;
};

export type PeopleIndexEntry = {
  id: string;
  key: string;
  dni: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  phone1: string | null;
  phone2: string | null;
  address: string | null;
  roles: PeopleRole[];
  cases: PeopleCase[];
  caseCount: number;
  latestCase: PeopleCase | null;
  updatedAt: Date | null;
  externalPersonIds: string[];
};

export type PeopleIndexFilters = {
  dni?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  caseQuery?: string;
};

export type PeopleIndexPermissions = {
  canDispatch: boolean;
  canJuridical: boolean;
};

type MutablePeopleEntry = Omit<PeopleIndexEntry, "roles" | "cases" | "caseCount" | "latestCase"> & {
  roles: Set<PeopleRole>;
  cases: PeopleCase[];
};

type PersonSource = {
  dni?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
  role: PeopleRole;
  caseItem?: PeopleCase;
  updatedAt?: Date | null;
  externalPersonId?: string | null;
};

export function roleLabel(role: PeopleRole) {
  if (role === "DENUNCIANTE") return "Denunciante";
  if (role === "DENUNCIADO_VINCULADO") return "Denunciado/vinculado";
  return "Registro";
}

function encodePeopleKey(key: string) {
  return `p-${Buffer.from(key, "utf8").toString("base64url")}`;
}

function decodePeopleId(id: string) {
  if (!id.startsWith("p-")) return null;
  try {
    return Buffer.from(id.slice(2), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function personName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return personDisplayName(lastName, firstName);
}

function personKey(source: PersonSource) {
  const dni = clean(source.dni);
  if (dni) return `dni:${dni}`;

  const name = normalizeName(personName(source.firstName, source.lastName));
  const phone = clean(source.phone1) ?? clean(source.phone2) ?? "";
  const address = source.address ? normalizeName(source.address) : "";
  if (!name && !phone && !address) return null;
  return `nodni:${name}|${phone}|${address}`;
}

function addCase(entry: MutablePeopleEntry, caseItem: PeopleCase | undefined) {
  if (!caseItem) return;
  const exists = entry.cases.some((item) => item.module === caseItem.module && item.id === caseItem.id && item.role === caseItem.role);
  if (!exists) entry.cases.push(caseItem);
}

function addSource(entries: Map<string, MutablePeopleEntry>, source: PersonSource) {
  const key = personKey(source);
  if (!key) return;
  const firstName = clean(source.firstName);
  const lastName = clean(source.lastName);
  const displayName = personName(firstName, lastName) || "Sin nombre";
  const existing = entries.get(key);

  if (!existing) {
    const entry: MutablePeopleEntry = {
      id: encodePeopleKey(key),
      key,
      dni: clean(source.dni),
      firstName,
      lastName,
      displayName,
      phone1: clean(source.phone1),
      phone2: clean(source.phone2),
      address: clean(source.address),
      roles: new Set([source.role]),
      cases: [],
      updatedAt: source.updatedAt ?? null,
      externalPersonIds: source.externalPersonId ? [source.externalPersonId] : [],
    };
    addCase(entry, source.caseItem);
    entries.set(key, entry);
    return;
  }

  existing.dni ??= clean(source.dni);
  existing.firstName ??= firstName;
  existing.lastName ??= lastName;
  existing.displayName = personName(existing.firstName, existing.lastName) || displayName;
  existing.phone1 ??= clean(source.phone1);
  existing.phone2 ??= clean(source.phone2);
  existing.address ??= clean(source.address);
  existing.roles.add(source.role);
  if (source.updatedAt && (!existing.updatedAt || source.updatedAt > existing.updatedAt)) existing.updatedAt = source.updatedAt;
  if (source.externalPersonId && !existing.externalPersonIds.includes(source.externalPersonId)) {
    existing.externalPersonIds.push(source.externalPersonId);
  }
  addCase(existing, source.caseItem);
}

function finalizeEntry(entry: MutablePeopleEntry): PeopleIndexEntry {
  const cases = [...entry.cases].sort((a, b) => b.attendedAt.getTime() - a.attendedAt.getTime());
  const uniqueCases = new Set(cases.map((item) => `${item.module}:${item.id}`));
  const roles = [...entry.roles].sort((a, b) => roleLabel(a).localeCompare(roleLabel(b), "es"));

  return {
    ...entry,
    roles,
    cases,
    caseCount: uniqueCases.size,
    latestCase: cases[0] ?? null,
  };
}

function matchesText(value: string | null | undefined, query: string | undefined) {
  if (!query) return true;
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function matchesNormalized(value: string, query: string | undefined) {
  if (!query) return true;
  return normalizeName(value).includes(normalizeName(query));
}

function matchesFilters(entry: PeopleIndexEntry, filters: PeopleIndexFilters) {
  if (!matchesText(entry.dni, filters.dni)) return false;
  if (!matchesText(entry.firstName, filters.firstName)) return false;
  if (!matchesText(entry.lastName, filters.lastName)) return false;
  if (filters.name && !matchesNormalized(entry.displayName, filters.name)) return false;
  if (filters.caseQuery && !entry.cases.some((item) => matchesNormalized(item.searchText, filters.caseQuery))) return false;
  return true;
}

function juridicalCaseSearchText(record: {
  internalNumber: string;
  oficioNumber: string | null;
  expedienteNumber: string | null;
}) {
  return [record.internalNumber, record.oficioNumber, record.expedienteNumber].filter(Boolean).join(" ");
}

export async function getPeopleIndex({
  filters = {},
  permissions,
  take = Number.POSITIVE_INFINITY,
}: {
  filters?: PeopleIndexFilters;
  permissions: PeopleIndexPermissions;
  take?: number;
}) {
  const [externalPeople, dispatchRecords, juridicalInterventions] = await Promise.all([
    prisma.externalPerson.findMany({ orderBy: { createdAt: "desc" } }),
    permissions.canDispatch
      ? prisma.dispatchRecord.findMany({
          include: {
            createdBy: true,
            person: true,
            complainants: { orderBy: { sortOrder: "asc" } },
            linkedPersons: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { attendedAt: "desc" },
        })
      : [],
    permissions.canJuridical
      ? prisma.juridicalIntervention.findMany({
          include: {
            createdBy: true,
            person: true,
            complainants: { orderBy: { sortOrder: "asc" } },
            linkedPersons: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { attendedAt: "desc" },
        })
      : [],
  ]);

  const entries = new Map<string, MutablePeopleEntry>();

  for (const person of externalPeople) {
    addSource(entries, {
      dni: person.dni,
      firstName: person.firstName,
      lastName: person.lastName,
      phone1: person.phone1,
      phone2: person.phone2,
      address: person.address,
      role: "REGISTRO",
      updatedAt: person.createdAt,
      externalPersonId: person.id,
    });
  }

  for (const record of dispatchRecords) {
    const baseCase = {
      module: "DESPACHO" as const,
      id: record.id,
      href: `/despacho/${record.id}`,
      internalNumber: record.internalNumber,
      attendedAt: record.attendedAt,
      kind: record.category,
      status: record.status,
      createdByName: record.createdBy.name,
      searchText: record.internalNumber,
    };

    for (const person of record.complainants) {
      if (person.isAnonymous) continue;
      addSource(entries, {
        dni: person.dni,
        firstName: person.firstName,
        lastName: person.lastName,
        phone1: person.phone1,
        phone2: person.phone2,
        address: person.address,
        role: "DENUNCIANTE",
        caseItem: { ...baseCase, role: "DENUNCIANTE" },
        updatedAt: record.createdAt,
      });
    }

    const linkedPersons = record.linkedPersons.length
      ? record.linkedPersons
      : record.person
        ? [
            {
              dni: record.person.dni,
              firstName: record.person.firstName,
              apellidoApodoManual: record.person.lastName,
              phone1: record.person.phone1,
              phone2: record.person.phone2,
              address: record.person.address,
            },
          ]
        : [];

    for (const person of linkedPersons) {
      addSource(entries, {
        dni: person.dni,
        firstName: person.firstName,
        lastName: person.apellidoApodoManual,
        phone1: person.phone1,
        phone2: person.phone2,
        address: person.address,
        role: "DENUNCIADO_VINCULADO",
        caseItem: { ...baseCase, role: "DENUNCIADO_VINCULADO" },
        updatedAt: record.createdAt,
      });
    }
  }

  for (const record of juridicalInterventions) {
    const baseCase = {
      module: "JURIDICO" as const,
      id: record.id,
      href: `/intervenciones/${record.id}`,
      internalNumber: record.internalNumber,
      attendedAt: record.attendedAt,
      kind: record.type,
      status: record.status,
      createdByName: record.createdBy.name,
      searchText: juridicalCaseSearchText(record),
    };

    for (const person of record.complainants) {
      if (person.isAnonymous) continue;
      addSource(entries, {
        dni: person.dni,
        firstName: person.firstName,
        lastName: person.lastName,
        phone1: person.phone1,
        phone2: person.phone2,
        address: person.address,
        role: "DENUNCIANTE",
        caseItem: { ...baseCase, role: "DENUNCIANTE" },
        updatedAt: record.createdAt,
      });
    }

    const linkedPersons = record.linkedPersons.length
      ? record.linkedPersons
      : record.person
        ? [
            {
              dni: record.person.dni,
              firstName: record.person.firstName,
              apellidoApodoManual: record.person.lastName,
              phone1: record.person.phone1,
              phone2: record.person.phone2,
              address: record.person.address,
            },
          ]
        : [];

    for (const person of linkedPersons) {
      addSource(entries, {
        dni: person.dni,
        firstName: person.firstName,
        lastName: person.apellidoApodoManual,
        phone1: person.phone1,
        phone2: person.phone2,
        address: person.address,
        role: "DENUNCIADO_VINCULADO",
        caseItem: { ...baseCase, role: "DENUNCIADO_VINCULADO" },
        updatedAt: record.createdAt,
      });
    }
  }

  return [...entries.values()]
    .map(finalizeEntry)
    .filter((entry) => matchesFilters(entry, filters))
    .sort((a, b) => {
      const byCreatedAt = (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
      return byCreatedAt || a.displayName.localeCompare(b.displayName, "es");
    })
    .slice(0, take);
}

export async function getPeopleProfile(id: string, permissions: PeopleIndexPermissions) {
  const decodedKey = decodePeopleId(id);
  const people = await getPeopleIndex({ permissions });
  return people.find((entry) => entry.key === decodedKey || entry.id === id || entry.externalPersonIds.includes(id)) ?? null;
}
