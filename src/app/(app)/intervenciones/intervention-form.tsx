"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Lock, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { JURIDICAL_DERIVED_AREAS, JURIDICAL_STATUSES, PRIORITIES } from "@/lib/constants";
import { formatDateTime, labelFromValue, normalizeName, toDateInputValue } from "@/lib/format";

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

type DniLookupPerson = {
  id: string;
  href: string;
  displayName: string;
  dni: string | null;
  firstName: string | null;
  lastName: string | null;
  phone1: string | null;
  phone2: string | null;
  address: string | null;
  roles: string[];
  caseCount: number;
  latestCase: {
    href: string;
    internalNumber: string;
    attendedAt: string;
  } | null;
};

type DniLookupResponse = {
  exists: boolean;
  person?: DniLookupPerson;
  error?: string;
};

type DniLookupState = {
  status: "idle" | "checking" | "found" | "not-found" | "error";
  dni?: string;
  person?: DniLookupPerson;
  error?: string;
};

type InterventionRecord = {
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
  confidentialNotes?: string | null;
  derivedArea?: string | null;
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

type InterventionWizardValues = {
  attendedAt: string;
  type: string;
  urgency: string;
  interventionContext: string;
  oficioNumber: string;
  expedienteNumber: string;
  complainants: ComplainantDraft[];
  linkedPersons: LinkedPersonDraft[];
  description: string;
  guidanceProvided: string;
  confidentialNotes: string;
  status: string;
  derivedArea: string;
};

type StepError = {
  field: string;
  message: string;
};

const steps = [{ label: "Situacion" }, { label: "Personas" }, { label: "Relato" }, { label: "Cierre" }];
const lastStepIndex = steps.length - 1;

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

const textareaClass =
  "min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const fileInputClass =
  "block w-full rounded-lg border border-dashed border-slate-400 bg-slate-50 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700";

const dniPattern = /^\d{7,8}$/;
const phonePattern = /^\d{7,10}$/;
const namePattern = /^[\p{L} ]+$/u;
const addressPattern = /^[\p{L}\d .,\-/]+$/u;
const letterPattern = /\p{L}/u;
const allowedControlKeys = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Tab",
  "Enter",
  "Escape",
]);

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentDateTimeInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function emptyComplainant(id = newId("complainant")): ComplainantDraft {
  return { id, isAnonymous: false, dni: "", firstName: "", lastName: "", phone1: "", phone2: "", address: "" };
}

function emptyLinkedPerson(id = newId("linked-person")): LinkedPersonDraft {
  return { id, dni: "", firstName: "", apellidoApodoManual: "", phone1: "", phone2: "", address: "" };
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function onlyLettersAndSpaces(value: string) {
  return Array.from(value)
    .filter((char) => char === " " || letterPattern.test(char))
    .join("")
    .replace(/ {2,}/g, " ");
}

function onlyAddressChars(value: string) {
  return Array.from(value)
    .filter((char) => /[\p{L}\d .,\-/]/u.test(char))
    .join("")
    .replace(/ {2,}/g, " ");
}

function preventInvalidKey(event: KeyboardEvent<HTMLInputElement>, allowed: RegExp) {
  if (event.ctrlKey || event.metaKey || event.altKey || allowedControlKeys.has(event.key)) return;
  if (event.key.length === 1 && !allowed.test(event.key)) event.preventDefault();
}

function valueAfterPaste(event: ClipboardEvent<HTMLInputElement>, sanitizer: (value: string) => string) {
  const input = event.currentTarget;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const pasted = event.clipboardData.getData("text");
  return sanitizer(`${input.value.slice(0, start)}${pasted}${input.value.slice(end)}`);
}

function cleanComplainant(person: ComplainantDraft) {
  return person.isAnonymous
    ? { isAnonymous: true, dni: "", firstName: "", lastName: "", phone1: "", phone2: "", address: "" }
    : {
        isAnonymous: false,
        dni: person.dni.trim(),
        firstName: person.firstName.trim(),
        lastName: person.lastName.trim(),
        phone1: person.phone1.trim(),
        phone2: person.phone2.trim(),
        address: person.address.trim(),
      };
}

function cleanLinkedPerson(person: LinkedPersonDraft) {
  return {
    dni: person.dni.trim(),
    firstName: person.firstName.trim(),
    apellidoApodoManual: person.apellidoApodoManual.trim(),
    phone1: person.phone1.trim(),
    phone2: person.phone2.trim(),
    address: person.address.trim(),
  };
}

function hasComplainantData(person: ComplainantDraft) {
  return Boolean(person.isAnonymous || person.dni || person.firstName || person.lastName || person.phone1 || person.phone2 || person.address);
}

function hasLinkedPersonData(person: LinkedPersonDraft) {
  return Boolean(person.dni || person.firstName || person.apellidoApodoManual || person.phone1 || person.phone2 || person.address);
}

function validateDni(field: string, value: string, label: string): StepError[] {
  if (!value) return [];
  return dniPattern.test(value) ? [] : [{ field, message: `${label} debe tener solo numeros, entre 7 y 8 digitos.` }];
}

function validatePhone(field: string, value: string, label: string): StepError[] {
  if (!value) return [];
  return phonePattern.test(value) ? [] : [{ field, message: `${label} debe tener solo numeros, entre 7 y 10 digitos.` }];
}

function validateName(field: string, value: string, label: string): StepError[] {
  if (!value.trim()) return [];
  return namePattern.test(value.trim()) ? [] : [{ field, message: `${label} solo permite letras, espacios, tildes y enies.` }];
}

function validateAddress(field: string, value: string, label: string): StepError[] {
  if (!value.trim()) return [];
  return addressPattern.test(value.trim())
    ? []
    : [{ field, message: `${label} solo permite letras, numeros, espacios, punto, coma, guion y barra.` }];
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

function valuesFromRecord(record?: InterventionRecord): InterventionWizardValues {
  return {
    attendedAt: record?.attendedAt ? toDateInputValue(record.attendedAt) : currentDateTimeInputValue(),
    type: record?.type ?? "",
    urgency: record?.urgency ?? "MEDIA",
    interventionContext: record?.interventionContext ?? "",
    oficioNumber: record?.oficioNumber ?? "",
    expedienteNumber: record?.expedienteNumber ?? "",
    complainants: complainantsFromRecord(record),
    linkedPersons: linkedPersonsFromRecord(record),
    description: record?.description ?? "",
    guidanceProvided: record?.guidanceProvided ?? "",
    confidentialNotes: record?.confidentialNotes ?? "",
    status: record?.status ?? "RECIBIDO",
    derivedArea: record?.derivedArea ?? "",
  };
}

function validateStep(index: number, values: InterventionWizardValues): StepError[] {
  if (index === 0) {
    const errors: StepError[] = [];
    if (!values.attendedAt) errors.push({ field: "attendedAt", message: "Ingresa fecha y hora." });
    if (!values.type) errors.push({ field: "type", message: "Selecciona un tipo." });
    if (!values.urgency || !PRIORITIES.includes(values.urgency)) {
      errors.push({ field: "urgency", message: "Selecciona una urgencia valida." });
    }
    if (values.attendedAt && Number.isNaN(new Date(values.attendedAt).getTime())) {
      errors.push({ field: "attendedAt", message: "Ingresa una fecha y hora valida." });
    }
    return errors;
  }

  if (index === 1) {
    return [
      ...values.complainants.flatMap((person, personIndex) => {
        if (person.isAnonymous) return [];
        return [
          ...validateDni(`complainants.${personIndex}.dni`, person.dni, "El DNI del denunciante"),
          ...validateName(`complainants.${personIndex}.firstName`, person.firstName, "El nombre del denunciante"),
          ...validateName(`complainants.${personIndex}.lastName`, person.lastName, "El apellido del denunciante"),
          ...validatePhone(`complainants.${personIndex}.phone1`, person.phone1, "El telefono 1 del denunciante"),
          ...validatePhone(`complainants.${personIndex}.phone2`, person.phone2, "El telefono 2 del denunciante"),
          ...validateAddress(`complainants.${personIndex}.address`, person.address, "El domicilio del denunciante"),
        ];
      }),
      ...values.linkedPersons.flatMap((person, personIndex) => [
        ...validateDni(`linkedPersons.${personIndex}.dni`, person.dni, "El DNI de la persona denunciada"),
        ...validateName(`linkedPersons.${personIndex}.firstName`, person.firstName, "El nombre de la persona denunciada"),
        ...validateName(
          `linkedPersons.${personIndex}.apellidoApodoManual`,
          person.apellidoApodoManual,
          "El apellido o apodo manual de la persona denunciada",
        ),
        ...validatePhone(`linkedPersons.${personIndex}.phone1`, person.phone1, "El telefono 1 de la persona denunciada"),
        ...validatePhone(`linkedPersons.${personIndex}.phone2`, person.phone2, "El telefono 2 de la persona denunciada"),
        ...validateAddress(`linkedPersons.${personIndex}.address`, person.address, "El domicilio de la persona denunciada"),
      ]),
    ];
  }

  if (index === 2 && !values.description.trim()) {
    return [{ field: "description", message: "La descripcion es obligatoria." }];
  }

  if (index === 3 && (!values.status || !JURIDICAL_STATUSES.includes(values.status))) {
    return [{ field: "status", message: "Selecciona un estado valido." }];
  }

  return [];
}

function validateAllSteps(values: InterventionWizardValues) {
  return steps.map((_, index) => validateStep(index, values));
}

function display(value: string | number | null | undefined) {
  if (value === 0) return "0";
  return value ? String(value) : "-";
}

function selectedLabel(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((item) => item.value === value)?.label ?? display(value);
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
      {error ? <span className="block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function hasLookupNameConflict(person: DniLookupPerson, firstName: string, lastName: string) {
  const enteredFirstName = firstName.trim();
  const enteredLastName = lastName.trim();
  const storedFirstName = person.firstName?.trim();
  const storedLastName = person.lastName?.trim();

  return Boolean(
    (enteredFirstName && storedFirstName && normalizeName(enteredFirstName) !== normalizeName(storedFirstName)) ||
      (enteredLastName && storedLastName && normalizeName(enteredLastName) !== normalizeName(storedLastName)),
  );
}

function DniLookupNotice({
  dni,
  firstName,
  lastName,
  onUseExisting,
  disabled = false,
}: {
  dni: string;
  firstName: string;
  lastName: string;
  onUseExisting?: (person: DniLookupPerson) => void;
  disabled?: boolean;
}) {
  const [lookup, setLookup] = useState<DniLookupState>({ status: "idle" });
  const cleanedDni = onlyDigits(dni, 8);
  const canLookupDni = !disabled && dniPattern.test(cleanedDni);

  useEffect(() => {
    if (!canLookupDni) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLookup({ status: "checking", dni: cleanedDni });

      try {
        const response = await fetch(`/api/personas/lookup?dni=${encodeURIComponent(cleanedDni)}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = (await response.json()) as DniLookupResponse;

        if (!response.ok) {
          setLookup({ status: "error", dni: cleanedDni, error: payload.error ?? "No se pudo validar el DNI." });
          return;
        }

        setLookup(
          payload.exists && payload.person
            ? { status: "found", dni: cleanedDni, person: payload.person }
            : { status: "not-found", dni: cleanedDni },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookup({ status: "error", dni: cleanedDni, error: "No se pudo validar el DNI." });
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [canLookupDni, cleanedDni]);

  const visibleLookup: DniLookupState = canLookupDni && lookup.dni === cleanedDni ? lookup : { status: "idle" };

  if (visibleLookup.status === "idle") return null;

  if (visibleLookup.status === "checking") {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
        Validando DNI en Personas...
      </div>
    );
  }

  if (visibleLookup.status === "not-found") {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
        No hay persona registrada con este DNI.
      </div>
    );
  }

  if (visibleLookup.status === "error") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
        {visibleLookup.error ?? "No se pudo validar el DNI ahora."}
      </div>
    );
  }

  const foundPerson = visibleLookup.person;
  if (!foundPerson) return null;

  const nameConflict = hasLookupNameConflict(foundPerson, firstName, lastName);
  const roles = foundPerson.roles.length ? foundPerson.roles.join(" / ") : "Registro";
  const cases = foundPerson.caseCount === 1 ? "1 caso" : `${foundPerson.caseCount} casos`;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-xs leading-5",
        nameConflict ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      <div className="flex items-start gap-2">
        {nameConflict ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
        <div className="min-w-0 space-y-1">
          <p>
            El DNI ya existe en Personas:{" "}
            <a href={foundPerson.href} className="font-semibold underline underline-offset-2">
              {foundPerson.displayName}
            </a>
            .
          </p>
          <p>
            {roles} - {cases}
            {foundPerson.latestCase
              ? ` - Ultimo caso ${foundPerson.latestCase.internalNumber} (${formatDateTime(foundPerson.latestCase.attendedAt)})`
              : ""}
          </p>
          {nameConflict ? <p className="font-semibold">El DNI ya figura con otro nombre, revisa los datos.</p> : null}
          {onUseExisting ? (
            <button
              type="button"
              onClick={() => onUseExisting(foundPerson)}
              className="mt-1 inline-flex h-8 items-center rounded-md border border-current bg-white/70 px-3 text-xs font-semibold transition hover:bg-white"
            >
              Usar datos existentes
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</div>
    </div>
  );
}

function SummaryBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

function SummaryItems({ items }: { items: Array<{ label: string; value: string | null | undefined }> }) {
  const visibleItems = items.filter((item) => item.value);
  if (!visibleItems.length) return <p className="text-sm text-slate-500">Sin datos cargados.</p>;
  return (
    <SummaryGrid>
      {visibleItems.map((item) => (
        <SummaryItem key={item.label} label={item.label} value={item.value} />
      ))}
    </SummaryGrid>
  );
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
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedSubmitRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState([true, false, false, false]);
  const [attemptedSteps, setAttemptedSteps] = useState([false, false, false, false]);
  const [values, setValues] = useState<InterventionWizardValues>(() => valuesFromRecord(record));
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const submittedComplainants = useMemo(
    () => values.complainants.filter(hasComplainantData).map(cleanComplainant),
    [values.complainants],
  );
  const submittedLinkedPersons = useMemo(
    () => values.linkedPersons.filter(hasLinkedPersonData).map(cleanLinkedPerson),
    [values.linkedPersons],
  );

  const stepErrors = useMemo(() => validateAllSteps(values), [values]);
  const allValid = stepErrors.every((errors) => errors.length === 0);
  const currentErrors = attemptedSteps[currentStep] ? stepErrors[currentStep] : [];
  const effectiveSubmitLabel = record ? (submitLabel ?? "Guardar cambios") : "Crear intervencion";

  function setValue<Key extends keyof InterventionWizardValues>(key: Key, value: InterventionWizardValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateComplainant(index: number, patch: Partial<ComplainantDraft>) {
    setValues((current) => ({
      ...current,
      complainants: current.complainants.map((person, personIndex) => (personIndex === index ? { ...person, ...patch } : person)),
    }));
  }

  function updateLinkedPerson(index: number, patch: Partial<LinkedPersonDraft>) {
    setValues((current) => ({
      ...current,
      linkedPersons: current.linkedPersons.map((person, personIndex) => (personIndex === index ? { ...person, ...patch } : person)),
    }));
  }

  function applyExistingComplainant(index: number, person: DniLookupPerson) {
    updateComplainant(index, {
      dni: onlyDigits(person.dni ?? "", 8),
      firstName: onlyLettersAndSpaces(person.firstName ?? ""),
      lastName: onlyLettersAndSpaces(person.lastName ?? ""),
      phone1: onlyDigits(person.phone1 ?? "", 10),
      phone2: onlyDigits(person.phone2 ?? "", 10),
      address: onlyAddressChars(person.address ?? ""),
    });
  }

  function applyExistingLinkedPerson(index: number, person: DniLookupPerson) {
    updateLinkedPerson(index, {
      dni: onlyDigits(person.dni ?? "", 8),
      firstName: onlyLettersAndSpaces(person.firstName ?? ""),
      apellidoApodoManual: onlyLettersAndSpaces(person.lastName ?? ""),
      phone1: onlyDigits(person.phone1 ?? "", 10),
      phone2: onlyDigits(person.phone2 ?? "", 10),
      address: onlyAddressChars(person.address ?? ""),
    });
  }

  function markAttempted(step: number) {
    setAttemptedSteps((current) => current.map((value, index) => (index === step ? true : value)));
  }

  function markVisited(step: number) {
    setVisitedSteps((current) => current.map((value, index) => (index === step ? true : value)));
  }

  function firstInvalidStepBefore(targetStep: number) {
    for (let index = 0; index < targetStep; index += 1) {
      if (stepErrors[index].length) return index;
    }
    return -1;
  }

  function canOpenStep(step: number) {
    if (step === currentStep) return true;
    if (step > furthestStep) return false;
    return firstInvalidStepBefore(step) === -1;
  }

  function focusFirstError(step: number) {
    const field = stepErrors[step][0]?.field;
    if (!field) return;
    window.requestAnimationFrame(() => {
      const control = formRef.current?.querySelector<HTMLElement>(`[name="${field.replace(/"/g, '\\"')}"]`);
      control?.focus();
    });
  }

  function goToStep(step: number) {
    setShowConfirm(false);
    if (step === currentStep) return;
    if (!canOpenStep(step)) {
      const invalidStep = firstInvalidStepBefore(step);
      const target = invalidStep >= 0 ? invalidStep : currentStep;
      markAttempted(target);
      setCurrentStep(target);
      focusFirstError(target);
      return;
    }
    setCurrentStep(step);
    markVisited(step);
  }

  function goBack() {
    if (currentStep > 0) goToStep(currentStep - 1);
  }

  function goNext() {
    setShowConfirm(false);
    markAttempted(currentStep);
    if (stepErrors[currentStep].length) {
      focusFirstError(currentStep);
      return;
    }
    const nextStep = Math.min(currentStep + 1, lastStepIndex);
    setFurthestStep((current) => Math.max(current, nextStep));
    setCurrentStep(nextStep);
    markVisited(nextStep);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedSubmitRef.current) return;

    event.preventDefault();

    if (currentStep < lastStepIndex) {
      event.preventDefault();
      confirmedSubmitRef.current = false;
      goNext();
      return;
    }

    const invalidStep = stepErrors.findIndex((errors) => errors.length > 0);
    if (invalidStep >= 0) {
      event.preventDefault();
      confirmedSubmitRef.current = false;
      setAttemptedSteps([true, true, true, true]);
      setCurrentStep(invalidStep);
      markVisited(invalidStep);
      focusFirstError(invalidStep);
      return;
    }

    setShowConfirm(true);
  }

  function openSummaryFromClosure() {
    setAttemptedSteps([true, true, true, true]);
    const invalidStep = stepErrors.findIndex((errors) => errors.length > 0);
    if (invalidStep >= 0) {
      confirmedSubmitRef.current = false;
      setShowConfirm(false);
      setCurrentStep(invalidStep);
      markVisited(invalidStep);
      focusFirstError(invalidStep);
      return;
    }
    setCurrentStep(lastStepIndex);
    markVisited(lastStepIndex);
    setShowConfirm(true);
  }

  function errorFor(field: string) {
    return currentErrors.find((error) => error.field === field)?.message;
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      noValidate
      className="rounded-lg bg-[#f0f2f5] p-3 sm:p-5"
    >
      <input type="hidden" name="complainantsPayload" value={JSON.stringify(submittedComplainants)} />
      <input type="hidden" name="linkedPersonsPayload" value={JSON.stringify(submittedLinkedPersons)} />

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ol className="grid grid-cols-4 gap-2">
            {steps.map((step, index) => {
              const isCurrent = index === currentStep;
              const isLocked = !isCurrent && !canOpenStep(index);
              const hasError = attemptedSteps[index] && stepErrors[index].length > 0;
              const isComplete = !isCurrent && !isLocked && visitedSteps[index] && !hasError && stepErrors[index].length === 0;

              return (
                <li key={step.label}>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    disabled={isLocked}
                    aria-current={isCurrent ? "step" : undefined}
                    className="group flex w-full flex-col items-center gap-2 text-center disabled:cursor-not-allowed"
                    title={isLocked ? "Paso bloqueado" : step.label}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition",
                        isCurrent && !hasError && "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200",
                        isCurrent && hasError && "border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-200",
                        isComplete && "border-emerald-500 bg-emerald-500 text-white",
                        hasError && !isCurrent && "border-rose-500 bg-rose-50 text-rose-600",
                        isLocked && "border-slate-200 bg-slate-100 text-slate-400",
                        !isCurrent && !isComplete && !hasError && !isLocked && "border-slate-300 bg-white text-slate-600 group-hover:border-blue-300",
                      )}
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : isComplete ? (
                        <Check className="h-4 w-4" />
                      ) : hasError && !isCurrent ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold leading-tight sm:text-xs",
                        isCurrent && "text-blue-700",
                        isComplete && "text-emerald-700",
                        hasError && "text-rose-600",
                        isLocked && "text-slate-400",
                        !isCurrent && !isComplete && !hasError && !isLocked && "text-slate-600",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className={cn(currentStep === 0 ? "grid gap-4" : "hidden")} aria-hidden={currentStep !== 0}>
          <StepCard title="Situacion">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Fecha y hora" error={errorFor("attendedAt")}>
                <input
                  name="attendedAt"
                  type="datetime-local"
                  value={values.attendedAt}
                  onChange={(event) => setValue("attendedAt", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Tipo" error={errorFor("type")}>
                <select name="type" value={values.type} onChange={(event) => setValue("type", event.target.value)} className={inputClass}>
                  <option value="">Seleccionar</option>
                  {types.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Urgencia" error={errorFor("urgency")}>
                <select name="urgency" value={values.urgency} onChange={(event) => setValue("urgency", event.target.value)} className={inputClass}>
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {labelFromValue(item)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contexto">
                <select
                  name="interventionContext"
                  value={values.interventionContext}
                  onChange={(event) => setValue("interventionContext", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin especificar</option>
                  {contexts.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Numero de oficio">
                <input
                  name="oficioNumber"
                  value={values.oficioNumber}
                  onChange={(event) => setValue("oficioNumber", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Numero de expediente">
                <input
                  name="expedienteNumber"
                  value={values.expedienteNumber}
                  onChange={(event) => setValue("expedienteNumber", event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </StepCard>
        </div>

        <div className={cn(currentStep === 1 ? "grid gap-4" : "hidden")} aria-hidden={currentStep !== 1}>
          <StepCard
            title="Personas denunciantes"
            action={
              <button
                type="button"
                onClick={() => setValue("complainants", [...values.complainants, emptyComplainant()])}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <Plus className="h-4 w-4" />
                Agregar denunciante
              </button>
            }
          >
            <div className="space-y-4">
              {values.complainants.map((person, personIndex) => (
                <div key={person.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Denunciante {personIndex + 1}</p>
                    {values.complainants.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setValue("complainants", values.complainants.filter((_, index) => index !== personIndex))}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-100 bg-white px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                  <label className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <input
                      name={`complainants.${personIndex}.isAnonymous`}
                      type="checkbox"
                      checked={person.isAnonymous}
                      onChange={(event) =>
                        updateComplainant(
                          personIndex,
                          event.target.checked
                            ? { isAnonymous: true, dni: "", firstName: "", lastName: "", phone1: "", phone2: "", address: "" }
                            : { isAnonymous: false },
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Denunciante anonimo
                  </label>
                  {person.isAnonymous ? (
                    <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-600">Denunciante anonimo.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Field label="DNI" error={errorFor(`complainants.${personIndex}.dni`)}>
                          <input
                            name={`complainants.${personIndex}.dni`}
                            value={person.dni}
                            onChange={(event) => updateComplainant(personIndex, { dni: onlyDigits(event.target.value, 8) })}
                            onKeyDown={(event) => preventInvalidKey(event, /^\d$/)}
                            onPaste={(event) => {
                              event.preventDefault();
                              updateComplainant(personIndex, { dni: valueAfterPaste(event, (value) => onlyDigits(value, 8)) });
                            }}
                            inputMode="numeric"
                            className={inputClass}
                          />
                        </Field>
                        <DniLookupNotice
                          dni={person.dni}
                          firstName={person.firstName}
                          lastName={person.lastName}
                          disabled={person.isAnonymous}
                          onUseExisting={(existingPerson) => applyExistingComplainant(personIndex, existingPerson)}
                        />
                      </div>
                      <Field label="Nombre" error={errorFor(`complainants.${personIndex}.firstName`)}>
                        <input
                          name={`complainants.${personIndex}.firstName`}
                          value={person.firstName}
                          onChange={(event) => updateComplainant(personIndex, { firstName: onlyLettersAndSpaces(event.target.value) })}
                          onKeyDown={(event) => preventInvalidKey(event, /^[\p{L} ]$/u)}
                          onPaste={(event) => {
                            event.preventDefault();
                            updateComplainant(personIndex, { firstName: valueAfterPaste(event, onlyLettersAndSpaces) });
                          }}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Apellido" error={errorFor(`complainants.${personIndex}.lastName`)}>
                        <input
                          name={`complainants.${personIndex}.lastName`}
                          value={person.lastName}
                          onChange={(event) => updateComplainant(personIndex, { lastName: onlyLettersAndSpaces(event.target.value) })}
                          onKeyDown={(event) => preventInvalidKey(event, /^[\p{L} ]$/u)}
                          onPaste={(event) => {
                            event.preventDefault();
                            updateComplainant(personIndex, { lastName: valueAfterPaste(event, onlyLettersAndSpaces) });
                          }}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Telefono 1" error={errorFor(`complainants.${personIndex}.phone1`)}>
                        <input
                          name={`complainants.${personIndex}.phone1`}
                          value={person.phone1}
                          onChange={(event) => updateComplainant(personIndex, { phone1: onlyDigits(event.target.value, 10) })}
                          onKeyDown={(event) => preventInvalidKey(event, /^\d$/)}
                          onPaste={(event) => {
                            event.preventDefault();
                            updateComplainant(personIndex, { phone1: valueAfterPaste(event, (value) => onlyDigits(value, 10)) });
                          }}
                          inputMode="numeric"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Telefono 2" error={errorFor(`complainants.${personIndex}.phone2`)}>
                        <input
                          name={`complainants.${personIndex}.phone2`}
                          value={person.phone2}
                          onChange={(event) => updateComplainant(personIndex, { phone2: onlyDigits(event.target.value, 10) })}
                          onKeyDown={(event) => preventInvalidKey(event, /^\d$/)}
                          onPaste={(event) => {
                            event.preventDefault();
                            updateComplainant(personIndex, { phone2: valueAfterPaste(event, (value) => onlyDigits(value, 10)) });
                          }}
                          inputMode="numeric"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Domicilio" error={errorFor(`complainants.${personIndex}.address`)}>
                        <input
                          name={`complainants.${personIndex}.address`}
                          value={person.address}
                          onChange={(event) => updateComplainant(personIndex, { address: onlyAddressChars(event.target.value) })}
                          onKeyDown={(event) => preventInvalidKey(event, /^[\p{L}\d .,\-/]$/u)}
                          onPaste={(event) => {
                            event.preventDefault();
                            updateComplainant(personIndex, { address: valueAfterPaste(event, onlyAddressChars) });
                          }}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </StepCard>

          <StepCard
            title="Personas denunciadas / vinculadas"
            action={
              <button
                type="button"
                onClick={() => setValue("linkedPersons", [...values.linkedPersons, emptyLinkedPerson()])}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <Plus className="h-4 w-4" />
                Agregar persona
              </button>
            }
          >
            <div className="space-y-4">
              {values.linkedPersons.map((person, personIndex) => (
                <div key={person.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Persona denunciada / vinculada {personIndex + 1}</p>
                    {values.linkedPersons.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setValue("linkedPersons", values.linkedPersons.filter((_, index) => index !== personIndex))}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-100 bg-white px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Field label="DNI" error={errorFor(`linkedPersons.${personIndex}.dni`)}>
                        <input
                          name={`linkedPersons.${personIndex}.dni`}
                          value={person.dni}
                          onChange={(event) => updateLinkedPerson(personIndex, { dni: onlyDigits(event.target.value, 8) })}
                          onKeyDown={(event) => preventInvalidKey(event, /^\d$/)}
                          onPaste={(event) => {
                            event.preventDefault();
                            updateLinkedPerson(personIndex, { dni: valueAfterPaste(event, (value) => onlyDigits(value, 8)) });
                          }}
                          inputMode="numeric"
                          className={inputClass}
                        />
                      </Field>
                      <DniLookupNotice
                        dni={person.dni}
                        firstName={person.firstName}
                        lastName={person.apellidoApodoManual}
                        onUseExisting={(existingPerson) => applyExistingLinkedPerson(personIndex, existingPerson)}
                      />
                    </div>
                    <Field label="Nombre" error={errorFor(`linkedPersons.${personIndex}.firstName`)}>
                      <input
                        name={`linkedPersons.${personIndex}.firstName`}
                        value={person.firstName}
                        onChange={(event) => updateLinkedPerson(personIndex, { firstName: onlyLettersAndSpaces(event.target.value) })}
                        onKeyDown={(event) => preventInvalidKey(event, /^[\p{L} ]$/u)}
                        onPaste={(event) => {
                          event.preventDefault();
                          updateLinkedPerson(personIndex, { firstName: valueAfterPaste(event, onlyLettersAndSpaces) });
                        }}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Apellido / apodo" error={errorFor(`linkedPersons.${personIndex}.apellidoApodoManual`)}>
                      <input
                        name={`linkedPersons.${personIndex}.apellidoApodoManual`}
                        value={person.apellidoApodoManual}
                        onChange={(event) => updateLinkedPerson(personIndex, { apellidoApodoManual: onlyLettersAndSpaces(event.target.value) })}
                        onKeyDown={(event) => preventInvalidKey(event, /^[\p{L} ]$/u)}
                        onPaste={(event) => {
                          event.preventDefault();
                          updateLinkedPerson(personIndex, { apellidoApodoManual: valueAfterPaste(event, onlyLettersAndSpaces) });
                        }}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Telefono 1" error={errorFor(`linkedPersons.${personIndex}.phone1`)}>
                      <input
                        name={`linkedPersons.${personIndex}.phone1`}
                        value={person.phone1}
                        onChange={(event) => updateLinkedPerson(personIndex, { phone1: onlyDigits(event.target.value, 10) })}
                        onKeyDown={(event) => preventInvalidKey(event, /^\d$/)}
                        onPaste={(event) => {
                          event.preventDefault();
                          updateLinkedPerson(personIndex, { phone1: valueAfterPaste(event, (value) => onlyDigits(value, 10)) });
                        }}
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Telefono 2" error={errorFor(`linkedPersons.${personIndex}.phone2`)}>
                      <input
                        name={`linkedPersons.${personIndex}.phone2`}
                        value={person.phone2}
                        onChange={(event) => updateLinkedPerson(personIndex, { phone2: onlyDigits(event.target.value, 10) })}
                        onKeyDown={(event) => preventInvalidKey(event, /^\d$/)}
                        onPaste={(event) => {
                          event.preventDefault();
                          updateLinkedPerson(personIndex, { phone2: valueAfterPaste(event, (value) => onlyDigits(value, 10)) });
                        }}
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Domicilio" error={errorFor(`linkedPersons.${personIndex}.address`)}>
                      <input
                        name={`linkedPersons.${personIndex}.address`}
                        value={person.address}
                        onChange={(event) => updateLinkedPerson(personIndex, { address: onlyAddressChars(event.target.value) })}
                        onKeyDown={(event) => preventInvalidKey(event, /^[\p{L}\d .,\-/]$/u)}
                        onPaste={(event) => {
                          event.preventDefault();
                          updateLinkedPerson(personIndex, { address: valueAfterPaste(event, onlyAddressChars) });
                        }}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </StepCard>
        </div>

        <div className={cn(currentStep === 2 ? "grid gap-4" : "hidden")} aria-hidden={currentStep !== 2}>
          <StepCard title="Relato">
            <div className="space-y-4">
              <Field label="Descripcion" error={errorFor("description")}>
                <textarea
                  name="description"
                  value={values.description}
                  onChange={(event) => setValue("description", event.target.value)}
                  className={textareaClass}
                />
              </Field>
              <Field label="Orientacion o intervencion realizada">
                <textarea
                  name="guidanceProvided"
                  value={values.guidanceProvided}
                  onChange={(event) => setValue("guidanceProvided", event.target.value)}
                  className={textareaClass}
                />
              </Field>
              <Field label="Notas internas confidenciales">
                <textarea
                  name="confidentialNotes"
                  value={values.confidentialNotes}
                  onChange={(event) => setValue("confidentialNotes", event.target.value)}
                  className={textareaClass}
                />
              </Field>
            </div>
          </StepCard>
        </div>

        <div className={cn(currentStep === 3 ? "grid gap-4" : "hidden")} aria-hidden={currentStep !== 3}>
          <StepCard title="Cierre">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Estado" error={errorFor("status")}>
                <select name="status" value={values.status} onChange={(event) => setValue("status", event.target.value)} className={inputClass}>
                  {JURIDICAL_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {labelFromValue(item)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Area derivada">
                <select
                  name="derivedArea"
                  value={values.derivedArea}
                  onChange={(event) => setValue("derivedArea", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin derivacion</option>
                  {JURIDICAL_DERIVED_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </Field>
              {!record ? (
                <Field label="Adjuntos" className="md:col-span-2 xl:col-span-3">
                  <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                    <UploadCloud className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
                    <div className="w-full space-y-2">
                      <input
                        name="attachments"
                        type="file"
                        multiple
                        onChange={(event) => setAttachmentNames(Array.from(event.target.files ?? []).map((file) => file.name))}
                        className={fileInputClass}
                      />
                      <p className="text-xs text-slate-500">
                        {attachmentNames.length ? `${attachmentNames.length} archivo(s) seleccionado(s).` : "Sin adjuntos seleccionados."}
                      </p>
                    </div>
                  </div>
                </Field>
              ) : null}
            </div>
          </StepCard>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {currentStep === 0 ? (
              modal ? (
                <Button type="button" variant="secondary" data-modal-close>
                  Cancelar
                </Button>
              ) : (
                <LinkButton href={backHref} variant="secondary">
                  Cancelar
                </LinkButton>
              )
            ) : (
              <Button type="button" variant="secondary" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
                Atras
              </Button>
            )}
            {currentStep > 0 ? (
              modal ? (
                <Button type="button" variant="secondary" data-modal-close>
                  Cancelar
                </Button>
              ) : (
                <LinkButton href={backHref} variant="secondary">
                  Cancelar
                </LinkButton>
              )
            ) : null}
          </div>

          {currentStep < lastStepIndex ? (
            <Button type="button" onClick={goNext} className="border-blue-600 bg-blue-600 hover:bg-blue-700">
              {currentStep === lastStepIndex - 1 ? "Continuar a cierre" : "Continuar"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" disabled={!allValid} onClick={openSummaryFromClosure} className="border-blue-600 bg-blue-600 hover:bg-blue-700">
              {effectiveSubmitLabel}
            </Button>
          )}
        </div>
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Resumen de la intervencion</h3>
              </div>
              <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>
                Editar
              </Button>
            </div>

            <div className="divide-y divide-slate-200">
              <SummaryBlock title="Situacion" onEdit={() => goToStep(0)}>
                <SummaryGrid>
                  <SummaryItem label="Fecha y hora" value={values.attendedAt ? formatDateTime(values.attendedAt) : "-"} />
                  <SummaryItem label="Tipo" value={selectedLabel(types, values.type)} />
                  <SummaryItem label="Urgencia" value={labelFromValue(values.urgency)} />
                  <SummaryItem label="Contexto" value={selectedLabel(contexts, values.interventionContext)} />
                  <SummaryItem label="Numero de oficio" value={values.oficioNumber} />
                  <SummaryItem label="Numero de expediente" value={values.expedienteNumber} />
                </SummaryGrid>
              </SummaryBlock>

              <SummaryBlock title="Personas denunciantes" onEdit={() => goToStep(1)}>
                {submittedComplainants.length ? (
                  <div className="space-y-3">
                    {submittedComplainants.map((person, index) => (
                      <div key={`summary-complainant-${index}`} className="rounded-md border border-slate-100 bg-white p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Denunciante {index + 1}</p>
                        {person.isAnonymous ? (
                          <p className="text-sm font-semibold text-slate-900">Denunciante anonimo</p>
                        ) : (
                          <SummaryItems
                            items={[
                              { label: "DNI", value: person.dni },
                              { label: "Nombre", value: person.firstName },
                              { label: "Apellido", value: person.lastName },
                              { label: "Telefono", value: [person.phone1, person.phone2].filter(Boolean).join(" / ") },
                              { label: "Domicilio", value: person.address },
                            ]}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">Sin denunciantes cargados.</p>
                )}
              </SummaryBlock>

              <SummaryBlock title="Personas denunciadas / vinculadas" onEdit={() => goToStep(1)}>
                {submittedLinkedPersons.length ? (
                  <div className="space-y-3">
                    {submittedLinkedPersons.map((person, index) => (
                      <div key={`summary-linked-${index}`} className="rounded-md border border-slate-100 bg-white p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Persona {index + 1}</p>
                        <SummaryItems
                          items={[
                            { label: "DNI", value: person.dni },
                            { label: "Nombre", value: person.firstName },
                            { label: "Apellido / apodo", value: person.apellidoApodoManual },
                            { label: "Telefono", value: [person.phone1, person.phone2].filter(Boolean).join(" / ") },
                            { label: "Domicilio", value: person.address },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">Sin personas denunciadas o vinculadas cargadas.</p>
                )}
              </SummaryBlock>

              <SummaryBlock title="Relato" onEdit={() => goToStep(2)}>
                <div className="space-y-3 text-sm leading-6 text-slate-800">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripcion</p>
                    <p className="mt-1 whitespace-pre-wrap">{display(values.description)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orientacion o intervencion realizada</p>
                    <p className="mt-1 whitespace-pre-wrap">{display(values.guidanceProvided)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas internas confidenciales</p>
                    <p className="mt-1 whitespace-pre-wrap">{display(values.confidentialNotes)}</p>
                  </div>
                </div>
              </SummaryBlock>

              <SummaryBlock title="Cierre" onEdit={() => goToStep(3)}>
                <SummaryGrid>
                  <SummaryItem label="Estado" value={labelFromValue(values.status)} />
                  <SummaryItem label="Area derivada" value={values.derivedArea || "Sin derivacion"} />
                  <SummaryItem label="Cantidad de adjuntos" value={!record ? attachmentNames.length : "Sin cambios desde este formulario"} />
                </SummaryGrid>
                {attachmentNames.length ? (
                  <ul className="mt-3 space-y-1 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {attachmentNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : null}
              </SummaryBlock>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>
                Editar
              </Button>
              <Button
                type="submit"
                onClick={() => {
                  confirmedSubmitRef.current = true;
                }}
                className="border-blue-600 bg-blue-600 hover:bg-blue-700"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
