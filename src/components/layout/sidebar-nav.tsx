"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Home,
  Landmark,
  Scale,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/components/ui/cn";

const iconMap = {
  home: Home,
  agenda: CalendarDays,
  despacho: ClipboardList,
  expedientes: BriefcaseBusiness,
  intervenciones: Scale,
  personas: Users,
  reportes: BarChart3,
  administracion: Settings,
  institucion: Landmark,
};

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
  children?: Array<{ href: string; label: string }>;
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1 px-3">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-sky-100 text-sky-950" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
            {item.children && active ? (
              <div className="ml-9 mt-1 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition",
                      pathname === child.href || pathname.startsWith(`${child.href}/`)
                        ? "bg-white text-sky-800 shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
