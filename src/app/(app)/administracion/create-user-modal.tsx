"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { FormField, FormGrid, inputClass } from "@/components/ui/form-controls";
import { SuccessToast } from "@/components/ui/success-toast";
import {
  CREATE_USER_PASSWORD_MESSAGE,
  CREATE_USER_SUCCESS_MESSAGE,
  createUserInitialState,
  RESET_USER_PASSWORD_SUCCESS_MESSAGE,
  resetUserPasswordInitialState,
  type CreateUserField,
} from "@/lib/admin-users";
import { createUser, resetUserPassword } from "./actions";

type RoleOption = {
  value: string;
  label: string;
};

type CreateUserValues = Record<CreateUserField, string>;
type PasswordValues = {
  password: string;
  passwordConfirm: string;
};

const emptyCreateUserValues: CreateUserValues = {
  name: "",
  username: "",
  email: "",
  role: "despacho",
  password: "",
  passwordConfirm: "",
};

const emptyPasswordValues: PasswordValues = {
  password: "",
  passwordConfirm: "",
};

function firstError<TField extends string>(
  state: { fieldErrors: Partial<Record<TField, string[]>> },
  field: TField,
) {
  return state.fieldErrors[field]?.[0];
}

function fieldClass(error?: string) {
  return cn(
    inputClass,
    error ? "border-[#dc3545] focus:border-[#dc3545] focus:ring-[rgba(220,53,69,.18)]" : undefined,
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-semibold leading-5 text-[#842029]" role="alert">
      {message}
    </p>
  );
}

function CreateUserForm({
  roles,
  onSuccess,
}: {
  roles: RoleOption[];
  onSuccess: (toastKey: string, message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(createUser, createUserInitialState);
  const [values, setValues] = useState<CreateUserValues>(emptyCreateUserValues);
  const router = useRouter();

  function updateValue(field: CreateUserField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (state.status !== "success" || !state.toastKey) return;
    router.refresh();
    onSuccess(state.toastKey, state.message ?? CREATE_USER_SUCCESS_MESSAGE);
  }, [onSuccess, router, state.message, state.status, state.toastKey]);

  const nameError = firstError<CreateUserField>(state, "name");
  const usernameError = firstError<CreateUserField>(state, "username");
  const emailError = firstError<CreateUserField>(state, "email");
  const roleError = firstError<CreateUserField>(state, "role");
  const passwordError = firstError<CreateUserField>(state, "password");
  const passwordConfirmError = firstError<CreateUserField>(state, "passwordConfirm");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message ? (
        <div
          className="rounded-sm border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#842029]"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <FormGrid>
        <FormField label="Nombre">
          <input
            name="name"
            value={values.name}
            onChange={(event) => updateValue("name", event.target.value)}
            className={fieldClass(nameError)}
            required
            maxLength={120}
            aria-invalid={Boolean(nameError)}
          />
          <FieldError message={nameError} />
        </FormField>
        <FormField label="Usuario">
          <input
            name="username"
            value={values.username}
            onChange={(event) => updateValue("username", event.target.value)}
            className={fieldClass(usernameError)}
            required
            maxLength={60}
            aria-invalid={Boolean(usernameError)}
          />
          <FieldError message={usernameError} />
        </FormField>
        <FormField label="Email">
          <input
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => updateValue("email", event.target.value)}
            className={fieldClass(emailError)}
            required
            maxLength={254}
            aria-invalid={Boolean(emailError)}
          />
          <FieldError message={emailError} />
        </FormField>
        <FormField label="Rol">
          <select
            name="role"
            value={values.role}
            onChange={(event) => updateValue("role", event.target.value)}
            className={fieldClass(roleError)}
            required
            aria-invalid={Boolean(roleError)}
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <FieldError message={roleError} />
        </FormField>
        <FormField label="Contrasena inicial">
          <input
            name="password"
            type="password"
            value={values.password}
            onChange={(event) => updateValue("password", event.target.value)}
            minLength={6}
            maxLength={72}
            className={fieldClass(passwordError)}
            required
            aria-describedby="create-user-password-help"
            aria-invalid={Boolean(passwordError)}
          />
          <p id="create-user-password-help" className="mt-1 text-xs leading-5 text-[#6c757d]">
            {CREATE_USER_PASSWORD_MESSAGE}
          </p>
          <FieldError message={passwordError} />
        </FormField>
        <FormField label="Repetir contrasena">
          <input
            name="passwordConfirm"
            type="password"
            value={values.passwordConfirm}
            onChange={(event) => updateValue("passwordConfirm", event.target.value)}
            minLength={6}
            maxLength={72}
            className={fieldClass(passwordConfirmError)}
            required
            aria-invalid={Boolean(passwordConfirmError)}
          />
          <FieldError message={passwordConfirmError} />
        </FormField>
      </FormGrid>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando..." : "Crear"}
        </Button>
        <Button type="button" variant="secondary" data-modal-close disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function CreateUserModal({ roles }: { roles: RoleOption[] }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ key: string; message: string } | null>(null);
  const handleSuccess = useCallback((toastKey: string, message: string) => {
    setOpen(false);
    setToast({ key: toastKey, message });
  }, []);

  return (
    <>
      <AppModal
        title="Crear usuario"
        trigger={
          <>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </>
        }
        size="lg"
        open={open}
        onOpenChange={setOpen}
      >
        <CreateUserForm roles={roles} onSuccess={handleSuccess} />
      </AppModal>
      {toast ? <SuccessToast key={toast.key} message={toast.message} placement="center" clearQueryParam={null} /> : null}
    </>
  );
}

function ResetUserPasswordForm({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: (toastKey: string, message: string) => void;
}) {
  const resetPasswordForUser = resetUserPassword.bind(null, userId);
  const [state, formAction, pending] = useActionState(resetPasswordForUser, resetUserPasswordInitialState);
  const [values, setValues] = useState<PasswordValues>(emptyPasswordValues);
  const router = useRouter();

  function updateValue(field: keyof PasswordValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (state.status !== "success" || !state.toastKey) return;
    router.refresh();
    onSuccess(state.toastKey, state.message ?? RESET_USER_PASSWORD_SUCCESS_MESSAGE);
  }, [onSuccess, router, state.message, state.status, state.toastKey]);

  const passwordError = firstError<keyof PasswordValues>(state, "password");
  const passwordConfirmError = firstError<keyof PasswordValues>(state, "passwordConfirm");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message ? (
        <div
          className="rounded-sm border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#842029]"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <FormGrid className="xl:grid-cols-2">
        <FormField label="Nueva contrasena">
          <input
            name="password"
            type="password"
            value={values.password}
            onChange={(event) => updateValue("password", event.target.value)}
            minLength={6}
            maxLength={72}
            className={fieldClass(passwordError)}
            required
            aria-describedby="reset-user-password-help"
            aria-invalid={Boolean(passwordError)}
          />
          <p id="reset-user-password-help" className="mt-1 text-xs leading-5 text-[#6c757d]">
            {CREATE_USER_PASSWORD_MESSAGE}
          </p>
          <FieldError message={passwordError} />
        </FormField>
        <FormField label="Repetir contrasena">
          <input
            name="passwordConfirm"
            type="password"
            value={values.passwordConfirm}
            onChange={(event) => updateValue("passwordConfirm", event.target.value)}
            minLength={6}
            maxLength={72}
            className={fieldClass(passwordConfirmError)}
            required
            aria-invalid={Boolean(passwordConfirmError)}
          />
          <FieldError message={passwordConfirmError} />
        </FormField>
      </FormGrid>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar contrasena"}
        </Button>
        <Button type="button" variant="secondary" data-modal-close disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function ResetUserPasswordModal({
  user,
}: {
  user: {
    id: string;
    name: string;
    username: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ key: string; message: string } | null>(null);
  const handleSuccess = useCallback((toastKey: string, message: string) => {
    setOpen(false);
    setToast({ key: toastKey, message });
  }, []);

  return (
    <>
      <AppModal
        title={`Cambiar contrasena de ${user.name}`}
        description={user.username}
        trigger={
          <>
            <KeyRound className="h-4 w-4" />
            Contrasena
          </>
        }
        triggerVariant="secondary"
        size="md"
        open={open}
        onOpenChange={setOpen}
      >
        <ResetUserPasswordForm userId={user.id} onSuccess={handleSuccess} />
      </AppModal>
      {toast ? <SuccessToast key={toast.key} message={toast.message} placement="center" clearQueryParam={null} /> : null}
    </>
  );
}
