import { toDateInputValue } from "@/lib/format";
import { DispatchWizardForm, type DispatchWizardValues, type LinkedPersonDraft } from "./dispatch-wizard-form";

type DispatchFormRecord = {
  createdAt?: Date | null;
  attendedAt?: Date | null;
  deadlineAt?: Date | null;
  usesHistoricalDate?: boolean | null;
  dniSnapshot?: string | null;
  nameSnapshot?: string | null;
  complainants?: StoredComplainant[] | null;
  linkedPersons?: StoredLinkedPerson[] | null;
  person?: {
    dni: string | null;
    firstName: string;
    lastName: string;
    phone1: string | null;
    phone2: string | null;
    address: string | null;
  } | null;
  description?: string | null;
  initialGuidance?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  referredArea?: string | null;
  confidentialNotes?: string | null;
};

type StoredComplainant = {
  id?: string;
  isAnonymous?: boolean;
  dni?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
};

type StoredLinkedPerson = {
  id?: string;
  dni?: string | null;
  firstName?: string | null;
  apellidoApodoManual?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
};

export function DispatchForm({
  action,
  record,
  categories,
  areas,
  backHref,
  modal = false,
  submitLabel,
  mode,
}: {
  action: (formData: FormData) => void | Promise<void>;
  record?: DispatchFormRecord;
  categories: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string }>;
  backHref: string;
  modal?: boolean;
  submitLabel?: string;
  mode?: "create" | "general-edit";
}) {
  const firstName = record?.person?.firstName ?? record?.nameSnapshot?.split(" ")[0] ?? "";
  const apellidoApodoManual = record?.person?.lastName ?? record?.nameSnapshot?.split(" ").slice(1).join(" ") ?? "";
  const complainants = record?.complainants ?? [];
  const linkedPersons = record?.linkedPersons ?? [];
  const hasLegacyLinkedPerson = Boolean(
    record?.person || record?.dniSnapshot || record?.nameSnapshot,
  );
  const fallbackComplainants: StoredComplainant[] = [{ isAnonymous: false }];
  const fallbackLinkedPerson: Omit<LinkedPersonDraft, "id"> = {
    dni: record?.person?.dni ?? record?.dniSnapshot ?? "",
    firstName,
    apellidoApodoManual,
    phone1: record?.person?.phone1 ?? "",
    phone2: record?.person?.phone2 ?? "",
    address: record?.person?.address ?? "",
  };
  const initialComplainants = (complainants.length ? complainants : fallbackComplainants).map((person, index) => ({
    id: `complainant-${index}`,
    isAnonymous: Boolean(person.isAnonymous),
    dni: person.dni ?? "",
    firstName: person.firstName ?? "",
    lastName: person.lastName ?? "",
    phone1: person.phone1 ?? "",
    phone2: person.phone2 ?? "",
    address: person.address ?? "",
  }));
  const initialLinkedPersons = (linkedPersons.length ? linkedPersons : [fallbackLinkedPerson]).map((person, index) => ({
    id: `linked-person-${index}`,
    dni: person.dni ?? "",
    firstName: person.firstName ?? "",
    apellidoApodoManual: person.apellidoApodoManual ?? "",
    phone1: person.phone1 ?? "",
    phone2: person.phone2 ?? "",
    address: person.address ?? "",
  }));

  const initialValues: DispatchWizardValues = {
    attendedAt: toDateInputValue(record?.attendedAt ?? new Date()),
    usesHistoricalDate: record ? Boolean(record.usesHistoricalDate) : false,
    deadlineAt: toDateInputValue(record?.deadlineAt),
    category: record?.category ?? "",
    priority: record?.priority ?? "MEDIA",
    status: record?.status ?? "RECIBIDO",
    referredArea: record?.referredArea ?? "",
    complainants: initialComplainants,
    linkedPersons: initialLinkedPersons,
    noLinkedPerson: Boolean(
      record && linkedPersons.length === 0 && !hasLegacyLinkedPerson,
    ),
    description: record?.description ?? "",
    initialGuidance: record?.initialGuidance ?? "",
    confidentialNotes: record?.confidentialNotes ?? "",
  };

  return (
    <DispatchWizardForm
      action={action}
      initialValues={initialValues}
      categories={categories}
      areas={areas}
      backHref={backHref}
      modal={modal}
      allowAttachments={!record}
      submitLabel={submitLabel ?? (record ? "Guardar cambios" : "Crear atencion")}
      mode={mode ?? (record ? "general-edit" : "create")}
    />
  );
}
