import { z } from "zod";
import { ROLES } from "./constants";

export const CREATE_USER_SUCCESS_MESSAGE = "Se creo correctamente el usuario.";
export const CREATE_USER_FORM_ERROR_MESSAGE = "Revisa los campos marcados antes de crear el usuario.";
export const CREATE_USER_DUPLICATE_USERNAME_MESSAGE = "Ya existe un usuario con ese nombre de usuario.";
export const CREATE_USER_DUPLICATE_EMAIL_MESSAGE = "Ya existe un usuario con ese email.";
export const CREATE_USER_DUPLICATE_MESSAGE = "No se pudo crear el usuario porque ya existen datos cargados.";
export const CREATE_USER_PASSWORD_MESSAGE =
  "La contrasena debe tener al menos 6 caracteres. Puede ser como prefieran; no hace falta usar mayusculas, numeros ni simbolos.";
export const CREATE_USER_PASSWORD_MAX_MESSAGE = "La contrasena no puede superar 72 caracteres.";
export const PASSWORD_CONFIRM_MESSAGE = "Las contrasenas no coinciden.";
export const RESET_USER_PASSWORD_SUCCESS_MESSAGE = "Se actualizo correctamente la contrasena.";
export const RESET_USER_PASSWORD_FORM_ERROR_MESSAGE = "Revisa las contrasenas marcadas antes de guardar.";

type ActionStatus = "idle" | "error" | "success";
type PasswordField = "password" | "passwordConfirm";

export type CreateUserField = "name" | "username" | "email" | "role" | PasswordField;
export type CreateUserFieldErrors = Partial<Record<CreateUserField, string[]>>;
export type ResetUserPasswordFieldErrors = Partial<Record<PasswordField, string[]>>;

export type CreateUserActionState = {
  status: ActionStatus;
  message: string | null;
  fieldErrors: CreateUserFieldErrors;
  toastKey?: string;
};

export type ResetUserPasswordActionState = {
  status: ActionStatus;
  message: string | null;
  fieldErrors: ResetUserPasswordFieldErrors;
  toastKey?: string;
};

export const createUserInitialState: CreateUserActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

export const resetUserPasswordInitialState: ResetUserPasswordActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

const passwordSchema = z.string().trim().min(6, CREATE_USER_PASSWORD_MESSAGE).max(72, CREATE_USER_PASSWORD_MAX_MESSAGE);

export const resetUserPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: passwordSchema,
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: PASSWORD_CONFIRM_MESSAGE,
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(120, "El nombre no puede superar 120 caracteres."),
  username: z.string().trim().min(3, "El usuario debe tener al menos 3 caracteres.").max(60, "El usuario no puede superar 60 caracteres."),
  email: z.string().trim().min(1, "El email es obligatorio.").max(254, "El email no puede superar 254 caracteres.").email("Ingresa un email valido.").transform((value) => value.toLowerCase()),
  role: z.string().refine((value) => Object.values(ROLES).includes(value as (typeof ROLES)[keyof typeof ROLES]), "Selecciona un rol valido."),
  password: passwordSchema,
  passwordConfirm: passwordSchema,
}).refine((value) => value.password === value.passwordConfirm, {
  path: ["passwordConfirm"],
  message: PASSWORD_CONFIRM_MESSAGE,
});

export function createUserErrorState(fieldErrors: CreateUserFieldErrors, message = CREATE_USER_FORM_ERROR_MESSAGE): CreateUserActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

export function resetUserPasswordErrorState(
  fieldErrors: ResetUserPasswordFieldErrors,
  message = RESET_USER_PASSWORD_FORM_ERROR_MESSAGE,
): ResetUserPasswordActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}
