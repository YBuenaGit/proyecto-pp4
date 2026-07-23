import Link from "next/link";
import Image from "next/image";
import { ROLE_LABELS } from "@/lib/constants";
import type { NavbarNotificationPayload } from "@/lib/deadline-notifications";
import { visibleModules } from "@/lib/rbac";
import type { CurrentUser } from "@/lib/types";
import { NotificationBell } from "./notification-bell";
import { ProfileAvatarMenu } from "./profile-avatar-menu";
import { SidebarNav, type NavItem } from "./sidebar-nav";

function buildNav(user: CurrentUser): NavItem[] {
  const visible = visibleModules(user);
  const items: NavItem[] = [
    { href: "/", label: "Anuncios importantes", icon: "announcements" },
    { href: "/panel", label: "Panel general", icon: "home" },
  ];

  if (visible.agenda) {
    items.push({ href: "/agenda", label: "Agenda", icon: "agenda" });
  }

  if (visible.despacho || visible.retenciones) {
    items.push({
      href: visible.despacho ? "/despacho" : "/retenciones",
      label: "Despacho",
      icon: "despacho",
      children: [
        ...(visible.despacho
          ? [
              { href: "/despacho", label: "Atenciones / Reclamos" },
              { href: "/despacho/expedientes", label: "Expedientes internos" },
            ]
          : []),
        ...(visible.retenciones ? [{ href: "/retenciones", label: "Retenciones / actas" }] : []),
      ],
    });
  }

  if (visible.juridico) {
    items.push({
      href: "/intervenciones",
      label: "Intervenciones",
      icon: "intervenciones",
    });
  }

  if (visible.personas) items.push({ href: "/personas", label: "Personas", icon: "personas" });
  if (visible.reportes) items.push({ href: "/reportes", label: "Reportes", icon: "reportes" });
  if (visible.administracion) {
    items.push({ href: "/administracion", label: "Administracion", icon: "administracion" });
  }

  return items;
}

export function AppShell({
  user,
  notifications,
  children,
}: {
  user: CurrentUser;
  notifications: NavbarNotificationPayload;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#212529]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#dee2e6] bg-white shadow-sm lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-[#dee2e6] bg-[#f8f9fa] px-3">
          <Image
            src="/logo-gum1.webp"
            alt="Logo Secretaria de Seguridad Ciudadana Yerba Buena"
            width={44}
            height={44}
            className="h-10 w-10 shrink-0 rounded-sm object-contain"
          />
          <div>
            <p className="text-sm font-semibold text-[#212529]">Seguridad Municipal</p>
            <p className="text-xs font-medium text-[#212529]">Portal interno</p>
          </div>
        </div>
        <SidebarNav items={buildNav(user)} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[#dee2e6] bg-white shadow-sm">
          <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 sm:px-4 lg:px-5">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#212529] lg:hidden">
              <Image
                src="/logo-gum1.webp"
                alt="Logo Secretaria de Seguridad Ciudadana Yerba Buena"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-sm object-contain"
              />
              Seguridad Municipal
            </Link>
            <div className="hidden text-sm font-medium text-[#212529] lg:block">Sistema interno de gestion juridica y operativa</div>
            <div className="flex items-center gap-2.5">
              <NotificationBell notifications={notifications} />
              <ProfileAvatarMenu
                key={user.avatarAttachmentId ?? "without-avatar"}
                userId={user.id}
                userName={user.name}
                avatarAttachmentId={user.avatarAttachmentId}
              />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-[#212529]">{user.name}</p>
                <p className="text-xs font-medium text-[#212529]">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="rounded-sm border border-[#6c757d] bg-white px-3 py-1.5 text-sm font-semibold text-[#495057] shadow-sm transition duration-150 hover:bg-[#e9ecef] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
          <div className="border-t border-[#dee2e6] bg-[#f8f9fa] lg:hidden">
            <SidebarNav items={buildNav(user)} />
          </div>
        </header>
        <main className="w-full px-3 py-4 sm:px-4 lg:px-5 lg:py-5">{children}</main>
      </div>
    </div>
  );
}
