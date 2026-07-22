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
  Newspaper,
  Scale,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/components/ui/cn";

const iconMap = {
  announcements: Newspaper,
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
    <nav className="flex gap-1.5 overflow-x-auto px-2 py-2 lg:block lg:space-y-1.5 lg:overflow-visible lg:px-2 lg:py-3">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const isChildActive = (childHref: string) =>
          pathname === childHref || (childHref !== item.href && pathname.startsWith(`${childHref}/`));
        const childActive = item.children?.some((child) => isChildActive(child.href)) ?? false;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || childActive;
        return (
          <div key={item.href} className="shrink-0 lg:shrink">
            <Link
              href={item.href}
              style={{ color: active ? "#ffffff" : "#17a2b8" }}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff] lg:w-full",
                active
                  ? "!bg-[#17a2b8] !text-white shadow-sm [&_svg]:!text-white"
                  : "!bg-white !text-[#17a2b8] hover:!bg-[#e8f7fa] hover:!text-[#17a2b8] [&_svg]:!text-[#17a2b8]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 !text-current" />
              <span className="text-current">{item.label}</span>
            </Link>
            {item.children && active ? (
              <div className="mt-1 flex gap-1.5 lg:block lg:space-y-1.5 lg:pl-6">
                {item.children.map((child) => {
                  const childIsActive = isChildActive(child.href);

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      style={{ color: childIsActive ? "#ffffff" : "#17a2b8" }}
                      className={cn(
                        "block min-h-9 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]",
                        childIsActive
                          ? "!bg-[#17a2b8] !text-white shadow-sm ring-1 ring-[#9fdbe5]"
                          : "!bg-white !text-[#17a2b8] hover:!bg-[#e8f7fa] hover:!text-[#17a2b8]",
                      )}
                    >
                      <span className="text-current">{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
