"use client";

import { useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Lock, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { DISPATCH_STATUSES, PRIORITIES } from "@/lib/constants";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { sortByLabel } from "@/lib/text";

export type DispatchWizardValues = {
  attendedAt: string;
  usesHistoricalDate: boolean;
  category: string;
  priority: string;
  status: string;
  referredArea: string;
  complainants: ComplainantDraft[];
  linkedPersons: LinkedPersonDraft[];
  description: string;
  initialGuidance: string;
  confidentialNotes: string;
};

type StepError = {
  field: string;
  message: string;
};

export type ComplainantDraft = {
  id: string;
  isAnonymous: boolean;
  dni: string;
  firstName: string;
  lastName: string;
  phone1: string;
  phone2: string;
  address: string;
};

export type LinkedPersonDraft = {
  id: string;
  dni: string;
  firstName: string;
  apellidoApodoManual: string;
  phone1: string;
  phone2: string;
  address: string;
};

const steps = [
  { label: "Situación" },
  { label: "Personas" },
  { label: "Relato" },
  { label: "Confirmación" },
];

const inputClass =
  "h-9 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 placeholder:text-[#6c757d] focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)] disabled:bg-[#e9ecef] disabled:text-[#6c757d]";

const textareaClass =
  "min-h-28 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-2 text-sm leading-6 text-[#212529] outline-none transition duration-150 placeholder:text-[#6c757d] focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]";
const autosizeTextareaClass = `${textareaClass} resize-none overflow-hidden`;

const fileInputClass =
  "block w-full rounded-sm border border-dashed border-[#17a2b8] bg-[#d1ecf1]/40 px-3 py-2.5 text-sm text-[#212529] file:mr-2 file:rounded-sm file:border-0 file:bg-[#0667b0] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0a61b9]";

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
  return {
    id,
    isAnonymous: false,
    dni: "",
    firstName: "",
    lastName: "",
    phone1: "",
    phone2: "",
    address: "",
  };
}

function emptyLinkedPerson(id = newId("linked-person")): LinkedPersonDraft {
  return {
    id,
    dni: "",
    firstName: "",
    apellidoApodoManual: "",
    phone1: "",
    phone2: "",
    address: "",
  };
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

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
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
  return dniPattern.test(value) ? [] : [{ field, message: `${label} debe tener solo números, entre 7 y 8 dígitos.` }];
}

function validatePhone(field: string, value: string, label: string): StepError[] {
  if (!value) return [];
  return phonePattern.test(value) ? [] : [{ field, message: `${label} debe tener solo números, entre 7 y 10 dígitos.` }];
}

function validateName(field: string, value: string, label: string): StepError[] {
  if (!value.trim()) return [];
  return namePattern.test(value.trim()) ? [] : [{ field, message: `${label} solo permite letras, espacios, tildes y ñ.` }];
}

function validateAddress(field: string, value: string, label: string): StepError[] {
  if (!value.trim()) return [];
  return addressPattern.test(value.trim())
    ? []
    : [{ field, message: `${label} solo permite letras, números, espacios, punto, coma, guion y barra.` }];
}

function validateStep(index: number, values: DispatchWizardValues): StepError[] {
  if (index === 0) {
    const errors: StepError[] = [];
    if (!values.attendedAt) errors.push({ field: "attendedAt", message: "Ingresá fecha y hora." });
    if (!values.category) errors.push({ field: "category", message: "Seleccioná una categoría." });
    if (!values.priority || !PRIORITIES.includes(values.priority)) {
      errors.push({ field: "priority", message: "Seleccioná una prioridad válida." });
    }
    if (values.attendedAt && Number.isNaN(new Date(values.attendedAt).getTime())) {
      errors.push({ field: "attendedAt", message: "Ingresá una fecha y hora válida." });
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
          ...validatePhone(`complainants.${personIndex}.phone1`, person.phone1, "El teléfono 1 del denunciante"),
          ...validatePhone(`complainants.${personIndex}.phone2`, person.phone2, "El teléfono 2 del denunciante"),
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
        ...validatePhone(`linkedPersons.${personIndex}.phone1`, person.phone1, "El teléfono 1 de la persona denunciada"),
        ...validatePhone(`linkedPersons.${personIndex}.phone2`, person.phone2, "El teléfono 2 de la persona denunciada"),
        ...validateAddress(`linkedPersons.${personIndex}.address`, person.address, "El domicilio de la persona denunciada"),
      ]),
    ];
  }

  if (index === 2 && !values.description.trim()) {
    return [{ field: "description", message: "La descripción redactada es obligatoria." }];
  }

  if (index === 3 && (!values.status || !DISPATCH_STATUSES.includes(values.status))) {
    return [{ field: "status", message: "Seleccioná un estado válido." }];
  }

  return [];
}

function validateAllSteps(values: DispatchWizardValues) {
  return steps.map((_, index) => validateStep(index, values));
}

function display(value: string | null | undefined) {
  return value?.trim() || "Sin dato";
}

function selectedLabel(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((item) => item.value === value)?.label ?? labelFromValue(value);
}

function StepCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-[#dee2e6] bg-white p-3 shadow-sm sm:p-3.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[#212529]">{title}</h3>
        {action}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
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
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6c757d]">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-semibold text-rose-600">{error}</span> : null}
    </label>
  );
}

function SummaryBlock({
  title,
  actionLabel,
  onEdit,
  children,
}: {
  title: string;
  actionLabel: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#dee2e6] py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#212529]">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[#bee5eb] bg-[#d1ecf1] px-2.5 py-1 text-xs font-semibold text-[#0c5460] transition hover:bg-[#bee5eb]"
        >
          <Pencil className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

function SummaryGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">{children}</dl>;
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md bg-[#f8f9fa] px-2.5 py-1.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6c757d]">{label}</dt>
      <dd className="mt-1 text-[#212529]">{value}</dd>
    </div>
  );
}

function SummaryItems({ items }: { items: Array<{ label: string; value: string }> }) {
  const visibleItems = items.filter((item) => item.value.trim());
  if (!visibleItems.length) {
    return <p className="rounded-md bg-[#f8f9fa] px-2.5 py-1.5 text-sm text-[#495057]">Sin datos cargados.</p>;
  }

  return (
    <SummaryGrid>
      {visibleItems.map((item) => (
        <SummaryItem key={item.label} label={item.label} value={item.value} />
      ))}
    </SummaryGrid>
  );
}

export function DispatchWizardForm({
  action,
  initialValues,
  categories,
  areas,
  backHref,
  modal = false,
  allowAttachments,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues: DispatchWizardValues;
  categories: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string }>;
  backHref: string;
  modal?: boolean;
  allowAttachments: boolean;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const createRequestedRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState([true, false, false, false]);
  const [attemptedSteps, setAttemptedSteps] = useState([false, false, false, false]);
  const [values, setValues] = useState<DispatchWizardValues>(initialValues);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const sortedCategories = useMemo(() => sortByLabel(categories, (item) => item.label), [categories]);
  const sortedAreas = useMemo(() => {
    const internalAreas = [
      { value: "DIRECTIVO", label: "Directivo" },
      { value: "INTERVENCIONES", label: "Intervenciones" },
    ];
    const unique = [...areas, ...internalAreas].filter(
      (item, index, items) => items.findIndex((candidate) => candidate.label.toLocaleLowerCase("es-AR") === item.label.toLocaleLowerCase("es-AR")) === index,
    );
    return sortByLabel(unique, (item) => item.label);
  }, [areas]);

  const submittedComplainants = useMemo(
    () => values.complainants.filter(hasComplainantData).map(cleanComplainant),
    [values.complainants],
  );
  const submittedLinkedPersons = useMemo(
    () => values.linkedPersons.filter(hasLinkedPersonData).map(cleanLinkedPerson),
    [values.linkedPersons],
  );
  const selectedArea = sortedAreas.find((item) => item.label === values.referredArea || item.value === values.referredArea)?.label;

  const stepErrors = useMemo(() => validateAllSteps(values), [values]);
  const allValid = stepErrors.every((errors) => errors.length === 0);
  const currentErrors = attemptedSteps[currentStep] ? stepErrors[currentStep] : [];

  function setValue<Key extends keyof DispatchWizardValues>(key: Key, value: DispatchWizardValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setAutosizedTextareaValue(
    key: "description" | "initialGuidance" | "confidentialNotes",
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    resizeTextarea(event.currentTarget);
    setValue(key, event.currentTarget.value);
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
    markAttempted(currentStep);
    if (stepErrors[currentStep].length) {
      focusFirstError(currentStep);
      return;
    }

    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    setFurthestStep((current) => Math.max(current, nextStep));
    setCurrentStep(nextStep);
    markVisited(nextStep);
  }

  function openSummary() {
    setAttemptedSteps([true, true, true, true]);
    const invalidStep = stepErrors.findIndex((errors) => errors.length > 0);
    if (invalidStep >= 0) {
      setCurrentStep(invalidStep);
      markVisited(invalidStep);
      focusFirstError(invalidStep);
      return;
    }
    setShowConfirm(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (currentStep < steps.length - 1) {
      event.preventDefault();
      createRequestedRef.current = false;
      setShowConfirm(false);
      goNext();
      return;
    }

    if (!createRequestedRef.current) {
      event.preventDefault();
      return;
    }

    const invalidStep = stepErrors.findIndex((errors) => errors.length > 0);
    if (invalidStep >= 0) {
      event.preventDefault();
      createRequestedRef.current = false;
      setAttemptedSteps([true, true, true, true]);
      setCurrentStep(invalidStep);
      markVisited(invalidStep);
      focusFirstError(invalidStep);
    }
  }

  function errorFor(field: string) {
    return currentErrors.find((error) => error.field === field)?.message;
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={handleSubmit}
      noValidate
      className="rounded-lg bg-[#f0f2f5] p-2 sm:p-3"
    >
      <input type="hidden" name="complainantsPayload" value={JSON.stringify(submittedComplainants)} />
      <input type="hidden" name="linkedPersonsPayload" value={JSON.stringify(submittedLinkedPersons)} />
      <input type="hidden" name="usesHistoricalDate" value={values.usesHistoricalDate ? "true" : "false"} />

      <div className="space-y-3">
        <div className="rounded-lg border border-[#dee2e6] bg-white p-2.5 shadow-sm">
          <ol className="grid grid-cols-4 gap-1.5">
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
                    className="group flex w-full flex-col items-center gap-1.5 text-center disabled:cursor-not-allowed"
                    title={isLocked ? "Paso bloqueado" : step.label}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition",
                        isCurrent && !hasError && "border-[#0667b0] bg-[#0667b0] text-white shadow-sm shadow-blue-200",
                        isCurrent && hasError && "border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-200",
                        isComplete && "border-emerald-500 bg-emerald-500 text-white",
                        hasError && !isCurrent && "border-rose-500 bg-rose-50 text-rose-600",
                        isLocked && "border-[#dee2e6] bg-[#e9ecef] text-[#adb5bd]",
                        !isCurrent && !isComplete && !hasError && !isLocked && "border-[#ced4da] bg-white text-[#6c757d] group-hover:border-blue-300",
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
                        isCurrent && "text-[#0c5460]",
                        isComplete && "text-emerald-700",
                        hasError && "text-rose-600",
                        isLocked && "text-[#adb5bd]",
                        !isCurrent && !isComplete && !hasError && !isLocked && "text-[#6c757d]",
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

        <div className={cn(currentStep === 0 ? "grid gap-3" : "hidden")} aria-hidden={currentStep !== 0}>
          <StepCard title="Situación">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Fecha y hora" error={errorFor("attendedAt")}>
                <details
                  open={values.usesHistoricalDate}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setValues((current) => ({
                      ...current,
                      usesHistoricalDate: isOpen,
                      attendedAt: isOpen ? current.attendedAt : currentDateTimeInputValue(),
                    }));
                  }}
                  className="rounded-lg border border-[#ced4da] bg-[#f8f9fa] text-sm text-[#495057] shadow-sm open:bg-white"
                >
                  <summary className="cursor-pointer select-none px-2.5 py-2 font-semibold outline-none transition hover:bg-[#e9ecef] focus-visible:ring-4 focus-visible:ring-[rgba(0,123,255,.25)]">
                    Usar fecha histórica
                  </summary>
                  <div className="border-t border-[#dee2e6] bg-white p-2.5">
                    <input
                      name="attendedAt"
                      type="datetime-local"
                      value={values.attendedAt}
                      onChange={(event) => setValue("attendedAt", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                </details>
              </Field>
              <Field label="Categoría" error={errorFor("category")}>
                <select
                  name="category"
                  value={values.category}
                  onChange={(event) => setValue("category", event.target.value)}
                  className={inputClass}
                  aria-required="true"
                >
                  <option value="">Seleccionar</option>
                  {sortedCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridad" error={errorFor("priority")}>
                <select
                  name="priority"
                  value={values.priority}
                  onChange={(event) => setValue("priority", event.target.value)}
                  className={inputClass}
                  aria-required="true"
                >
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {labelFromValue(item)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </StepCard>
        </div>

        <div className={cn(currentStep === 1 ? "grid gap-3" : "hidden")} aria-hidden={currentStep !== 1}>
          <StepCard
            title="Personas denunciantes"
            action={
              <button
                type="button"
                onClick={() => setValue("complainants", [...values.complainants, emptyComplainant()])}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#bee5eb] bg-[#d1ecf1] px-2.5 py-1 text-xs font-semibold text-[#0c5460] transition hover:bg-[#bee5eb]"
              >
                <Plus className="h-4 w-4" />
                Agregar otro denunciante
              </button>
            }
          >
            <div className="space-y-3">
              {values.complainants.map((person, personIndex) => (
                <div key={person.id} className="rounded-lg border border-[#dee2e6] bg-[#f8f9fa] p-2.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#212529]">Denunciante {personIndex + 1}</p>
                    {values.complainants.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "complainants",
                            values.complainants.filter((_, index) => index !== personIndex),
                          )
                        }
                        className="inline-flex min-h-8 items-center gap-1 rounded-md border border-rose-100 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                  <label className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-[#495057]">
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
                      className="h-4 w-4 rounded border-[#ced4da] text-[#0667b0] focus:ring-blue-500"
                    />
                    Denunciante anónimo
                  </label>
                  {person.isAnonymous ? (
                    <p className="rounded-md bg-white px-2.5 py-1.5 text-sm text-[#6c757d]">Los campos personales quedan ocultos para este denunciante.</p>
                  ) : (
                    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
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
                      <Field label="Teléfono 1" error={errorFor(`complainants.${personIndex}.phone1`)}>
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
                      <Field label="Teléfono 2" error={errorFor(`complainants.${personIndex}.phone2`)}>
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
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#bee5eb] bg-[#d1ecf1] px-2.5 py-1 text-xs font-semibold text-[#0c5460] transition hover:bg-[#bee5eb]"
              >
                <Plus className="h-4 w-4" />
                Agregar otra persona denunciada
              </button>
            }
          >
            <div className="space-y-3">
              {values.linkedPersons.map((person, personIndex) => (
                <div key={person.id} className="rounded-lg border border-[#dee2e6] bg-[#f8f9fa] p-2.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#212529]">Persona denunciada / vinculada {personIndex + 1}</p>
                    {values.linkedPersons.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "linkedPersons",
                            values.linkedPersons.filter((_, index) => index !== personIndex),
                          )
                        }
                        className="inline-flex min-h-8 items-center gap-1 rounded-md border border-rose-100 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
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
                    <Field label="Apellido / Apodo manual" error={errorFor(`linkedPersons.${personIndex}.apellidoApodoManual`)}>
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
                    <Field label="Teléfono 1" error={errorFor(`linkedPersons.${personIndex}.phone1`)}>
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
                    <Field label="Teléfono 2" error={errorFor(`linkedPersons.${personIndex}.phone2`)}>
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

        <div className={cn(currentStep === 2 ? "grid gap-3" : "hidden")} aria-hidden={currentStep !== 2}>
          <StepCard title="Relato">
            <div className="space-y-3">
              <Field label="Descripción redactada" error={errorFor("description")}>
                <textarea
                  name="description"
                  value={values.description}
                  onChange={(event) => setAutosizedTextareaValue("description", event)}
                  onInput={(event) => resizeTextarea(event.currentTarget)}
                  data-autosize="true"
                  className={autosizeTextareaClass}
                  aria-required="true"
                />
              </Field>
              <Field label="Orientación brindada / intervención inicial">
                <textarea
                  name="initialGuidance"
                  value={values.initialGuidance}
                  onChange={(event) => setAutosizedTextareaValue("initialGuidance", event)}
                  onInput={(event) => resizeTextarea(event.currentTarget)}
                  data-autosize="true"
                  className={autosizeTextareaClass}
                />
              </Field>
              <Field label="Notas internas confidenciales">
                <textarea
                  name="confidentialNotes"
                  value={values.confidentialNotes}
                  onChange={(event) => setAutosizedTextareaValue("confidentialNotes", event)}
                  onInput={(event) => resizeTextarea(event.currentTarget)}
                  data-autosize="true"
                  className={autosizeTextareaClass}
                />
              </Field>
            </div>
          </StepCard>
        </div>

        <div className={cn(currentStep === 3 ? "grid gap-3" : "hidden")} aria-hidden={currentStep !== 3}>
          <StepCard title="Cierre">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Estado" error={errorFor("status")}>
                <select
                  name="status"
                  value={values.status}
                  onChange={(event) => setValue("status", event.target.value)}
                  className={inputClass}
                  aria-required="true"
                >
                  {DISPATCH_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {labelFromValue(item)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Área derivada">
                <select
                  name="referredArea"
                  value={values.referredArea}
                  onChange={(event) => setValue("referredArea", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin derivación</option>
                  {sortedAreas.map((item) => (
                    <option key={item.value} value={item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              {allowAttachments ? (
                <Field label="Adjuntos" className="md:col-span-2 xl:col-span-3">
                  <div className="flex items-start gap-2 rounded-lg bg-[#f8f9fa] p-2.5">
                    <UploadCloud className="mt-1 h-5 w-5 shrink-0 text-[#0667b0]" />
                    <div className="w-full space-y-1.5">
                      <input
                        name="attachments"
                        type="file"
                        multiple
                        onChange={(event) => setAttachmentNames(Array.from(event.target.files ?? []).map((file) => file.name))}
                        className={fileInputClass}
                      />
                      <p className="text-xs text-[#6c757d]">
                        {attachmentNames.length ? `${attachmentNames.length} archivo(s) seleccionado(s).` : "Sin adjuntos seleccionados."}
                      </p>
                    </div>
                  </div>
                </Field>
              ) : null}
            </div>
          </StepCard>

          {showConfirm ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-lg bg-[#f0f2f5] p-3 shadow-xl sm:p-4">
                <StepCard
                  title="Resumen de la atencion"
                  action={(
                    <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>
                      Editar
                    </Button>
                  )}
                >
            <div className="divide-y divide-slate-200">
              <SummaryBlock title="Situación" actionLabel="Editar situación" onEdit={() => goToStep(0)}>
                <SummaryGrid>
                  <SummaryItem label="Fecha y hora" value={values.attendedAt ? formatDateTime(values.attendedAt) : "Fecha y hora actual al crear"} />
                  <SummaryItem label="Categoría" value={selectedLabel(sortedCategories, values.category)} />
                  <SummaryItem label="Prioridad" value={labelFromValue(values.priority)} />
                </SummaryGrid>
              </SummaryBlock>

              <SummaryBlock title="Personas denunciantes" actionLabel="Editar personas" onEdit={() => goToStep(1)}>
                {submittedComplainants.length ? (
                  <div className="space-y-2">
                    {submittedComplainants.map((person, index) => (
                      <div key={`summary-complainant-${index}`} className="rounded-md border border-[#e9ecef] bg-white p-2.5">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Denunciante {index + 1}</p>
                        {person.isAnonymous ? (
                          <p className="text-sm font-semibold text-[#212529]">Denunciante anónimo</p>
                        ) : (
                          <SummaryItems
                            items={[
                              { label: "DNI", value: person.dni },
                              { label: "Apellido", value: person.lastName },
                              { label: "Nombre", value: person.firstName },
                              { label: "Teléfono disponible", value: [person.phone1, person.phone2].filter(Boolean).join(" / ") },
                              { label: "Domicilio", value: person.address },
                            ]}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md bg-[#f8f9fa] px-2.5 py-1.5 text-sm text-[#495057]">Sin denunciantes cargados.</p>
                )}
              </SummaryBlock>

              <SummaryBlock title="Personas denunciadas / vinculadas" actionLabel="Editar personas" onEdit={() => goToStep(1)}>
                {submittedLinkedPersons.length ? (
                  <div className="space-y-2">
                    {submittedLinkedPersons.map((person, index) => (
                      <div key={`summary-linked-${index}`} className="rounded-md border border-[#e9ecef] bg-white p-2.5">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Persona denunciada / vinculada {index + 1}</p>
                        <SummaryItems
                          items={[
                            { label: "DNI", value: person.dni },
                            { label: "Apellido / Apodo manual", value: person.apellidoApodoManual },
                            { label: "Nombre", value: person.firstName },
                            { label: "Teléfono", value: [person.phone1, person.phone2].filter(Boolean).join(" / ") },
                            { label: "Domicilio", value: person.address },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md bg-[#f8f9fa] px-2.5 py-1.5 text-sm text-[#495057]">Sin personas denunciadas o vinculadas cargadas.</p>
                )}
              </SummaryBlock>

              <SummaryBlock title="Relato" actionLabel="Editar relato" onEdit={() => goToStep(2)}>
                <div className="space-y-2 text-sm leading-6 text-[#212529]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Descripción redactada</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{display(values.description)}</p>
                  </div>
                  {values.initialGuidance ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Orientación brindada / intervención inicial</p>
                      <p className="mt-0.5 whitespace-pre-wrap">{values.initialGuidance}</p>
                    </div>
                  ) : null}
                  {values.confidentialNotes ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Notas internas confidenciales</p>
                      <p className="mt-0.5 whitespace-pre-wrap">{values.confidentialNotes}</p>
                    </div>
                  ) : null}
                </div>
              </SummaryBlock>

              <SummaryBlock title="Cierre" actionLabel="Editar cierre" onEdit={() => goToStep(3)}>
                <SummaryGrid>
                  <SummaryItem label="Estado" value={labelFromValue(values.status)} />
                  <SummaryItem label="Área derivada" value={selectedArea ?? "Sin derivación"} />
                  <SummaryItem label="Cantidad de adjuntos" value={allowAttachments ? attachmentNames.length : "Sin cambios desde este formulario"} />
                </SummaryGrid>
                {attachmentNames.length ? (
                  <ul className="mt-2 space-y-0.5 rounded-md bg-[#f8f9fa] px-2.5 py-1.5 text-sm text-[#495057]">
                    {attachmentNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : null}
              </SummaryBlock>
            </div>

            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
              Revisá la información cargada antes de crear la atención. Una vez creada, quedará registrada en el sistema.
            </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#dee2e6] pt-4">
                    <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>
                      Editar
                    </Button>
                    <Button
                      type="submit"
                      onClick={() => {
                        createRequestedRef.current = true;
                      }}
                      className="border-[#0667b0] bg-[#0667b0] hover:bg-blue-700"
                    >
                      {submitLabel === "Crear" ? "Confirmar creacion" : submitLabel}
                    </Button>
                  </div>
                </StepCard>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#dee2e6] bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
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
                Atrás
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

          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={goNext} className="border-[#0667b0] bg-[#0667b0] hover:bg-blue-700">
              Continuar
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!allValid}
              onClick={openSummary}
              className="border-[#0667b0] bg-[#0667b0] hover:bg-blue-700"
            >
              Revisar y confirmar
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
