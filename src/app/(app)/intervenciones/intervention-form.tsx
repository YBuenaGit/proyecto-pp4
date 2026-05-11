"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { JURIDICAL_STATUSES, PRIORITIES } from "@/lib/constants";
import { labelFromValue, toDateInputValue } from "@/lib/format";

type ComplainantDraft = {
  id: string;
  isAnonymous: boolean;
  dni: string;
  firstName: string;
  lastName: string;
  phone1: string;
  phone2: string;
  address: string;
};

type LinkedPersonDraft = {
  id: string;
  dni: string;
  firstName: string;
  apellidoApodoManual: string;
  phone1: string;
  phone2: string;
  address: string;
};

type InterventionRecord = {
  createdAt?: Date | null;
  attendedAt?: Date | null;
  dniSnapshot?: string | null;
  nameSnapshot?: string | null;
  complainantIsAnonymous?: boolean | null;
  complainantDni?: string | null;
  complainantFirstName?: string | null;
  complainantLastName?: string | null;
  complainantPhone1?: string | null;
  complainantPhone2?: string | null;
  complainantAddress?: string | null;
  person?: {
    dni: string | null;
    firstName: string;
    lastName: string;
    phone1: string | null;
    phone2: string | null;
    address: string | null;
  } | null;
  type?: string | null;
  urgency?: string | null;
  status?: string | null;
  oficioNumber?: string | null;
  expedienteNumber?: string | null;
  interventionContext?: string | null;
  description?: string | null;
  guidanceProvided?: string | null;
  complainants?: Array<{
    id: string;
    isAnonymous: boolean;
    dni: string | null;
    firstName: string | null;
    lastName: string | null;
    phone1: string | null;
    phone2: string | null;
    address: string | null;
  }>;
  linkedPersons?: Array<{
    id: string;
    dni: string | null;
    firstName: string | null;
    apellidoApodoManual: string | null;
    phone1: string | null;
    phone2: string | null;
    address: string | null;
  }>;
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyComplainant(id = newId("complainant")): ComplainantDraft {
  return { id, isAnonymous: false, dni: "", firstName: "", lastName: "", phone1: "", phone2: "", address: "" };
}

function emptyLinkedPerson(id = newId("linked-person")): LinkedPersonDraft {
  return { id, dni: "", firstName: "", apellidoApodoManual: "", phone1: "", phone2: "", address: "" };
}

function complainantsFromRecord(record?: InterventionRecord): ComplainantDraft[] {
  if (record?.complainants?.length) {
    return record.complainants.map((person) => ({
      id: person.id,
      isAnonymous: person.isAnonymous,
      dni: person.dni ?? "",
      firstName: person.firstName ?? "",
      lastName: person.lastName ?? "",
      phone1: person.phone1 ?? "",
      phone2: person.phone2 ?? "",
      address: person.address ?? "",
    }));
  }
  if (
    record &&
    (record.complainantIsAnonymous ||
      record.complainantDni ||
      record.complainantFirstName ||
      record.complainantLastName ||
      record.complainantPhone1 ||
      record.complainantPhone2 ||
      record.complainantAddress)
  ) {
    return [
      {
        id: "complainant-existing",
        isAnonymous: Boolean(record.complainantIsAnonymous),
        dni: record.complainantDni ?? "",
        firstName: record.complainantFirstName ?? "",
        lastName: record.complainantLastName ?? "",
        phone1: record.complainantPhone1 ?? "",
        phone2: record.complainantPhone2 ?? "",
        address: record.complainantAddress ?? "",
      },
    ];
  }
  return [emptyComplainant("complainant-initial")];
}

function linkedPersonsFromRecord(record?: InterventionRecord): LinkedPersonDraft[] {
  if (record?.linkedPersons?.length) {
    return record.linkedPersons.map((person) => ({
      id: person.id,
      dni: person.dni ?? "",
      firstName: person.firstName ?? "",
      apellidoApodoManual: person.apellidoApodoManual ?? "",
      phone1: person.phone1 ?? "",
      phone2: person.phone2 ?? "",
      address: person.address ?? "",
    }));
  }
  if (record && (record.person || record.dniSnapshot || record.nameSnapshot)) {
    return [
      {
        id: "linked-person-existing",
        dni: record.person?.dni ?? record.dniSnapshot ?? "",
        firstName: record.person?.firstName ?? record.nameSnapshot?.split(" ")[0] ?? "",
        apellidoApodoManual: record.person?.lastName ?? record.nameSnapshot?.split(" ").slice(1).join(" ") ?? "",
        phone1: record.person?.phone1 ?? "",
        phone2: record.person?.phone2 ?? "",
        address: record.person?.address ?? "",
      },
    ];
  }
  return [emptyLinkedPerson("linked-person-initial")];
}

export function InterventionForm({
  action,
  record,
  types,
  contexts,
  backHref,
  modal = false,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  record?: InterventionRecord;
  types: Array<{ value: string; label: string }>;
  contexts: Array<{ value: string; label: string }>;
  backHref: string;
  modal?: boolean;
  submitLabel?: string;
}) {
  const initialComplainants = useMemo(() => complainantsFromRecord(record), [record]);
  const initialLinkedPersons = useMemo(() => linkedPersonsFromRecord(record), [record]);
  const [complainants, setComplainants] = useState(initialComplainants);
  const [linkedPersons, setLinkedPersons] = useState(initialLinkedPersons);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="complainantsPayload" value={JSON.stringify(complainants)} />
      <input type="hidden" name="linkedPersonsPayload" value={JSON.stringify(linkedPersons)} />
      <DetailSection title="Datos de intervencion">
        <FormGrid>
          <FormField label="Fecha y hora">
            {record ? (
              <input name="attendedAt" type="datetime-local" defaultValue={toDateInputValue(record.attendedAt)} className={inputClass} />
            ) : (
              <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">Usar fecha historica</summary>
                <input name="attendedAt" type="datetime-local" className={`${inputClass} mt-3`} />
              </details>
            )}
          </FormField>
          <FormField label="Tipo">
            <select name="type" defaultValue={record?.type ?? ""} className={inputClass} required>
              <option value="">Seleccionar</option>
              {types.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Urgencia">
            <select name="urgency" defaultValue={record?.urgency ?? "MEDIA"} className={inputClass}>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Contexto">
            <select name="interventionContext" defaultValue={record?.interventionContext ?? ""} className={inputClass}>
              <option value="">Sin especificar</option>
              {contexts.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Numero de oficio">
            <input name="oficioNumber" defaultValue={record?.oficioNumber ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Numero de expediente">
            <input name="expedienteNumber" defaultValue={record?.expedienteNumber ?? ""} className={inputClass} />
          </FormField>
        </FormGrid>
      </DetailSection>

      <DetailSection title="Persona denunciante">
        <div className="space-y-3">
          {complainants.map((person, index) => (
            <div key={person.id} className="rounded-md border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={person.isAnonymous}
                    onChange={(event) =>
                      setComplainants((current) =>
                        current.map((item) => (item.id === person.id ? { ...item, isAnonymous: event.target.checked } : item)),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  Denunciante anonimo
                </label>
                {complainants.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setComplainants((current) => current.filter((item) => item.id !== person.id))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                    aria-label={`Quitar denunciante ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <FormGrid>
                <FormField label="DNI">
                  <input
                    value={person.dni}
                    onChange={(event) =>
                      setComplainants((current) => current.map((item) => (item.id === person.id ? { ...item, dni: event.target.value } : item)))
                    }
                    disabled={person.isAnonymous}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Nombre">
                  <input
                    value={person.firstName}
                    onChange={(event) =>
                      setComplainants((current) => current.map((item) => (item.id === person.id ? { ...item, firstName: event.target.value } : item)))
                    }
                    disabled={person.isAnonymous}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Apellido">
                  <input
                    value={person.lastName}
                    onChange={(event) =>
                      setComplainants((current) => current.map((item) => (item.id === person.id ? { ...item, lastName: event.target.value } : item)))
                    }
                    disabled={person.isAnonymous}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Telefono 1">
                  <input
                    value={person.phone1}
                    onChange={(event) =>
                      setComplainants((current) => current.map((item) => (item.id === person.id ? { ...item, phone1: event.target.value } : item)))
                    }
                    disabled={person.isAnonymous}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Telefono 2">
                  <input
                    value={person.phone2}
                    onChange={(event) =>
                      setComplainants((current) => current.map((item) => (item.id === person.id ? { ...item, phone2: event.target.value } : item)))
                    }
                    disabled={person.isAnonymous}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Domicilio">
                  <input
                    value={person.address}
                    onChange={(event) =>
                      setComplainants((current) => current.map((item) => (item.id === person.id ? { ...item, address: event.target.value } : item)))
                    }
                    disabled={person.isAnonymous}
                    className={inputClass}
                  />
                </FormField>
              </FormGrid>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setComplainants((current) => [...current, emptyComplainant()])}>
            <Plus className="h-4 w-4" />
            Agregar denunciante
          </Button>
        </div>
      </DetailSection>

      <DetailSection title="Persona vinculada / denunciada">
        <div className="space-y-3">
          {linkedPersons.map((person, index) => (
            <div key={person.id} className="rounded-md border border-slate-200 p-3">
              <div className="mb-3 flex justify-end">
                {linkedPersons.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setLinkedPersons((current) => current.filter((item) => item.id !== person.id))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                    aria-label={`Quitar persona vinculada ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <FormGrid>
                <FormField label="DNI">
                  <input
                    value={person.dni}
                    onChange={(event) =>
                      setLinkedPersons((current) => current.map((item) => (item.id === person.id ? { ...item, dni: event.target.value } : item)))
                    }
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Nombre">
                  <input
                    value={person.firstName}
                    onChange={(event) =>
                      setLinkedPersons((current) => current.map((item) => (item.id === person.id ? { ...item, firstName: event.target.value } : item)))
                    }
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Apellido / apodo">
                  <input
                    value={person.apellidoApodoManual}
                    onChange={(event) =>
                      setLinkedPersons((current) =>
                        current.map((item) => (item.id === person.id ? { ...item, apellidoApodoManual: event.target.value } : item)),
                      )
                    }
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Telefono 1">
                  <input
                    value={person.phone1}
                    onChange={(event) =>
                      setLinkedPersons((current) => current.map((item) => (item.id === person.id ? { ...item, phone1: event.target.value } : item)))
                    }
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Telefono 2">
                  <input
                    value={person.phone2}
                    onChange={(event) =>
                      setLinkedPersons((current) => current.map((item) => (item.id === person.id ? { ...item, phone2: event.target.value } : item)))
                    }
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Domicilio">
                  <input
                    value={person.address}
                    onChange={(event) =>
                      setLinkedPersons((current) => current.map((item) => (item.id === person.id ? { ...item, address: event.target.value } : item)))
                    }
                    className={inputClass}
                  />
                </FormField>
              </FormGrid>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setLinkedPersons((current) => [...current, emptyLinkedPerson()])}>
            <Plus className="h-4 w-4" />
            Agregar persona vinculada / denunciada
          </Button>
        </div>
      </DetailSection>

      <DetailSection title="Contenido de la intervencion">
        <div className="space-y-4">
          <FormField label="Descripcion">
            <textarea name="description" defaultValue={record?.description ?? ""} className={textareaClass} required />
          </FormField>
          <FormField label="Orientacion o intervencion realizada">
            <textarea name="guidanceProvided" defaultValue={record?.guidanceProvided ?? ""} className={textareaClass} />
          </FormField>
          {!record ? (
            <FormField label="Adjuntos privados">
              <input
                name="attachments"
                type="file"
                multiple
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-800"
              />
            </FormField>
          ) : null}
          <FormField label="Estado">
            <select name="status" defaultValue={record?.status ?? "RECIBIDO"} className={inputClass}>
              {JURIDICAL_STATUSES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
        </div>
      </DetailSection>

      <div className="flex items-center gap-2">
        <Button type="submit">{submitLabel ?? (record ? "Guardar cambios" : "Crear")}</Button>
        {modal ? (
          <Button type="button" variant="secondary" data-modal-close>
            Cancelar
          </Button>
        ) : (
          <LinkButton href={backHref} variant="secondary">Cancelar</LinkButton>
        )}
      </div>
    </form>
  );
}
