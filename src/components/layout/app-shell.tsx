import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { visibleModules } from "@/lib/rbac";
import type { CurrentUser } from "@/lib/types";
import { SidebarNav, type NavItem } from "./sidebar-nav";

function buildNav(user: CurrentUser): NavItem[] {
  const visible = visibleModules(user);
  const items: NavItem[] = [{ href: "/", label: "Inicio", icon: "home" }];

  if (visible.agenda) {
    items.push({ href: "/agenda", label: "Agenda", icon: "agenda" });
  }

  if (visible.despacho) {
    items.push({
      href: "/despacho",
      label: "Despacho",
      icon: "despacho",
      children: [
        { href: "/despacho", label: "Atenciones / Reclamos" },
        { href: "/despacho/expedientes", label: "Expedientes internos" },
      ],
    });
  }

  if (visible.juridico) {
    items.push({
      href: "/intervenciones",
      label: "Intervenciones",
      icon: "intervenciones",
      children: [{ href: "/intervenciones", label: "Intervenciones" }],
    });
  }

  if (visible.personas) items.push({ href: "/personas", label: "Personas", icon: "personas" });
  if (visible.reportes) items.push({ href: "/reportes", label: "Reportes", icon: "reportes" });
  if (visible.administracion) {
    items.push({ href: "/administracion", label: "Administracion", icon: "administracion" });
  }

  return items;
}

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-200 text-slate-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Seguridad Municipal</p>
            <p className="text-xs text-slate-500">Gestion interna</p>
          </div>
        </div>
        <SidebarNav items={buildNav(user)} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-900 lg:hidden">
              <ShieldCheck className="h-5 w-5 text-sky-700" />
              Seguridad Municipal
            </Link>
            <div className="hidden text-sm text-slate-500 lg:block">Sistema interno de gestion</div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
              <Link
                href="/logout"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Salir
              </Link>
            </div>
          </div>
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <SidebarNav items={buildNav(user)} />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
