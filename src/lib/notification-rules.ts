import { ROLES } from "./constants";

type NotificationUser = {
  role: string;
};

export function notificationDestinationModulesForUser(user: NotificationUser) {
  if (user.role === ROLES.admin || user.role === ROLES.directivo) return ["DESPACHO", "JURIDICO", "DIRECTIVO"];
  if (user.role === ROLES.despacho) return ["DESPACHO"];
  if (user.role === ROLES.juridico) return ["JURIDICO"];
  return [];
}

export function shouldRestrictDeadlineNotificationsToOwn() {
  return false;
}
