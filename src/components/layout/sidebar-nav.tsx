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
    <nav className="flex gap-1 overflow-x-auto px-2 py-2 lg:mt-4 lg:block lg:space-y-1 lg:overflow-visible lg:px-3 lg:py-0">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <div key={item.href} className="shrink-0 lg:shrink">
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2] lg:w-full",
                active
                  ? "bg-[#173f63] text-white shadow-[0_12px_24px_rgba(23,63,99,0.18)]"
                  : "text-[#607589] hover:bg-[#eaf3f8] hover:text-[#173f63]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
            {item.children && active ? (
              <div className="mt-1 flex gap-1 lg:block lg:space-y-1 lg:pl-7">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2]",
                      pathname === child.href || pathname.startsWith(`${child.href}/`)
                        ? "bg-white text-[#173f63] shadow-sm ring-1 ring-[#d7e4ee]"
                        : "text-[#6a7f91] hover:bg-[#edf5f9] hover:text-[#173f63]",
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
