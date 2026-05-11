import { Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { getPeopleProfile, type PeopleIndexEntry } from "@/lib/people-index";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch, canAccessJuridical } from "@/lib/rbac";
import { param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";
import { createJuridicalIntervention } from "../actions";
import { InterventionForm } from "../intervention-form";

type PrefillRole = "complainant" | "linked";

function normalizePrefillRole(value: string | undefined): PrefillRole {
  return value === "linked" ? "linked" : "complainant";
}

function prefillRecordFromPerson(person: PeopleIndexEntry | null, role: PrefillRole) {
  if (!person) return undefined;

  const personData = {
    id: `prefill-${role}`,
    dni: person.dni,
    firstName: person.firstName,
    phone1: person.phone1,
    phone2: person.phone2,
    address: person.address,
  };

  if (role === "linked") {
    return {
      linkedPersons: [
        {
          ...personData,
          apellidoApodoManual: person.lastName,
        },
      ],
    };
  }

  return {
    complainants: [
      {
        ...personData,
        isAnonymous: false,
        lastName: person.lastName,
      },
    ],
  };
}

export default async function NewInterventionPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const params = searchParams ? await searchParams : {};
  const prefillPersonId = param(params, "personId");
  const prefillRole = normalizePrefillRole(param(params, "role"));
  const [types, contexts] = await Promise.all([
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "intervention_context", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const prefillPerson = prefillPersonId
    ? await getPeopleProfile(prefillPersonId, {
        canDispatch: canAccessDispatch(user),
        canJuridical: canAccessJuridical(user),
      })
    : null;
  const prefillRecord = prefillRecordFromPerson(prefillPerson, prefillRole);

  return (
    <>
      <PageHeader
        title="Nueva intervencion"
        description="Carga directa del modulo Juridico-Institucional."
        actions={
          <AppModal
            title="Nueva intervencion"
            trigger={<><Plus className="h-4 w-4" />Nueva intervencion</>}
            size="xl"
            defaultOpen={Boolean(prefillRecord)}
          >
            <InterventionForm
              action={createJuridicalIntervention}
              record={prefillRecord}
              types={types.map((item) => ({ value: item.value, label: item.label }))}
              contexts={contexts.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/intervenciones"
              modal
              submitLabel="Crear"
            />
          </AppModal>
        }
      />
      <p className="text-sm text-slate-600">Usa el boton Nueva intervencion para abrir el formulario de carga.</p>
    </>
  );
}
