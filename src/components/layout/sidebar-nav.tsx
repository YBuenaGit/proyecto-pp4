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
    <nav className="flex gap-1 overflow-x-auto px-2 py-2 lg:block lg:space-y-1 lg:overflow-visible lg:px-2 lg:py-3">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const childActive = item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)) ?? false;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || childActive;
        return (
          <div key={item.href} className="shrink-0 lg:shrink">
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff] lg:w-full",
                active
                  ? "bg-[#0667b0] text-white shadow-sm"
                  : "text-[#495057] hover:bg-[#e8f2ff] hover:text-[#0667b0]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
            {item.children && active ? (
              <div className="mt-1 flex gap-1 lg:block lg:space-y-1 lg:pl-6">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "block whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]",
                      pathname === child.href || pathname.startsWith(`${child.href}/`)
                        ? "bg-[#0667b0] text-white ring-1 ring-[#9cc7ff]"
                        : "text-[#6c757d] hover:bg-[#e8f2ff] hover:text-[#0667b0]",
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
