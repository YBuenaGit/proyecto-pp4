import { requireUser } from "@/lib/auth";
import { assertAccess, canAccessRetentions } from "@/lib/rbac";
import { RetentionsClient } from "./retentions-client";

export default async function RetentionsPage() {
  const user = await requireUser();
  assertAccess(canAccessRetentions(user));

  return <RetentionsClient currentUserName={user.name} />;
}
