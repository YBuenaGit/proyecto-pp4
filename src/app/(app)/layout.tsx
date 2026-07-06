import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { getNavbarNotifications } from "@/lib/deadline-notifications";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notifications = await getNavbarNotifications(user);
  return <AppShell user={user} notifications={notifications}>{children}</AppShell>;
}
