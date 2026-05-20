import Link from "next/link";
import Image from "next/image";
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
    <div className="min-h-screen text-[#172033]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-[#d7e4ee] bg-[#fbfdff]/[0.96] shadow-[18px_0_44px_rgba(26,68,104,0.08)] backdrop-blur lg:block">
        <div className="flex h-[4.75rem] items-center gap-3 border-b border-[#d7e4ee] px-4">
          <Image
            src="/logo-gum1.webp"
            alt="Logo Secretaria de Seguridad Ciudadana Yerba Buena"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-contain shadow-[0_12px_28px_rgba(23,63,99,0.18)]"
          />
          <div>
            <p className="text-sm font-semibold tracking-[-0.01em] text-[#132f49]">Seguridad Municipal</p>
            <p className="text-xs font-medium text-[#6a7f91]">Gestion interna</p>
          </div>
        </div>
        <SidebarNav items={buildNav(user)} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#d7e4ee] bg-[#fbfdff]/[0.88] shadow-[0_12px_34px_rgba(26,68,104,0.07)] backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-[1540px] items-center justify-between gap-3 px-3 py-2 sm:px-5 lg:px-7">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#132f49] lg:hidden">
              <Image
                src="/logo-gum1.webp"
                alt="Logo Secretaria de Seguridad Ciudadana Yerba Buena"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-contain"
              />
              Seguridad Municipal
            </Link>
            <div className="hidden text-sm font-medium text-[#65798c] lg:block">Sistema interno de gestion juridica y operativa</div>
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <p className="text-sm font-semibold text-[#172033]">{user.name}</p>
                <p className="text-xs font-medium text-[#6a7f91]">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
              <Link
                href="/logout"
                className="rounded-lg border border-[#c9d9e5] bg-white/80 px-3 py-2 text-sm font-semibold text-[#2f4c63] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#9bb8ca] hover:bg-[#f3f8fb] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2]"
              >
                Salir
              </Link>
            </div>
          </div>
          <div className="border-t border-[#d7e4ee] bg-[#fbfdff]/[0.92] lg:hidden">
            <SidebarNav items={buildNav(user)} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1540px] px-3 py-5 sm:px-5 lg:px-7 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
