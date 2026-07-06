import { notFound, redirect } from "next/navigation";
import { ROLES } from "./constants";
import type { CurrentUser } from "./types";
import { canAccessAgenda } from "./appointment-permissions";

export function isDirectivo(user: CurrentUser | null) {
  return user?.role === ROLES.directivo;
}

export function isAdmin(user: CurrentUser | null) {
  return user?.role === ROLES.admin;
}

export function canBypassLegajoRestriction(user: CurrentUser | null) {
  return isDirectivo(user) || isAdmin(user);
}

export function canAccessDispatch(user: CurrentUser | null) {
  return user?.role === ROLES.despacho || isDirectivo(user) || isAdmin(user);
}

export function canAccessJuridical(user: CurrentUser | null) {
  return user?.role === ROLES.juridico || isDirectivo(user) || isAdmin(user);
}

export function canAccessExpedients(user: CurrentUser | null) {
  return canAccessDispatch(user);
}

export function canAccessPeople(user: CurrentUser | null) {
  return Boolean(user);
}

export function canAccessReports(user: CurrentUser | null) {
  return Boolean(user);
}

export function canAccessAdmin(user: CurrentUser | null) {
  return isAdmin(user);
}

export function canAccessRetentions(user: CurrentUser | null) {
  return user?.role === ROLES.despacho || user?.role === ROLES.admin || isDirectivo(user);
}

export function visibleModules(user: CurrentUser | null) {
  return {
    agenda: canAccessAgenda(user),
    despacho: canAccessDispatch(user),
    juridico: canAccessJuridical(user),
    expedientes: canAccessExpedients(user),
    personas: canAccessPeople(user),
    reportes: canAccessReports(user),
    retenciones: canAccessRetentions(user),
    administracion: canAccessAdmin(user),
  };
}

export function assertAccess(condition: boolean) {
  if (!condition) notFound();
}

export function redirectByRole(user: CurrentUser) {
  if (user.role === ROLES.juridico) redirect("/intervenciones");
  if (user.role === ROLES.admin) redirect("/administracion");
  redirect("/");
}
