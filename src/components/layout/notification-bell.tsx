"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/app/(app)/notification-actions";
import { cn } from "@/components/ui/cn";
import type { NavbarNotificationPayload } from "@/lib/deadline-notifications";

const collapsedCount = 6;

function countLabel(value: number) {
  return value > 99 ? "99+" : String(value);
}

function kindLabel(kind: "agenda" | "deadline" | "referral") {
  if (kind === "agenda") return "Agenda";
  return kind === "deadline" ? "Plazo" : "Derivacion";
}

function kindClass(kind: "agenda" | "deadline" | "referral") {
  if (kind === "agenda") return "border-[#9ec5fe] bg-[#0d6efd] text-white";
  return kind === "deadline"
    ? "border-[#f1aeb5] bg-[#dc3545] text-white"
    : "border-[#75b798] bg-[#198754] text-white";
}

export function NotificationBell({ notifications }: { notifications: NavbarNotificationPayload }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [locallyReadKeys, setLocallyReadKeys] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  const readKeys = useMemo(() => {
    const next = new Set(locallyReadKeys);
    notifications.items.forEach((item) => {
      if (item.isRead) next.add(item.notificationKey);
    });
    return next;
  }, [locallyReadKeys, notifications.items]);

  const unreadCount = useMemo(
    () => notifications.items.filter((item) => !readKeys.has(item.notificationKey)).length,
    [notifications.items, readKeys],
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const visibleItems = useMemo(
    () => notifications.items.slice(0, expanded ? notifications.items.length : collapsedCount),
    [expanded, notifications.items],
  );

  const markRead = useCallback((keys: string[]) => {
    const nextKeys = keys.filter((key) => !readKeys.has(key));
    if (!nextKeys.length) return;

    setLocallyReadKeys((current) => {
      const next = new Set(current);
      nextKeys.forEach((key) => next.add(key));
      return next;
    });
    startTransition(() => {
      void markNotificationsRead(nextKeys);
    });
  }, [readKeys, startTransition]);

  const hasMore = notifications.items.length > collapsedCount;
  const visibleTotalText = notifications.total > notifications.items.length
    ? `Mostrando ${notifications.items.length} de ${notifications.total}`
    : `${notifications.total} pendiente(s)`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-[#ced4da] bg-white text-[#212529] shadow-sm transition hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full border border-white bg-[#dc3545] px-1 text-center text-[10px] font-bold leading-5 text-white">
            {countLabel(unreadCount)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-sm border border-[#dee2e6] bg-white shadow-xl max-sm:fixed max-sm:inset-x-3 max-sm:top-14 max-sm:mt-0 max-sm:flex max-sm:max-h-[calc(100dvh-4.25rem)] max-sm:w-auto max-sm:flex-col">
          <div className="border-b border-[#dee2e6] bg-[#f8f9fa] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#212529]">Notificaciones</p>
              {unreadCount ? <p className="text-xs font-semibold text-[#0667b0]">{unreadCount} sin leer</p> : null}
            </div>
            <p className="text-xs text-[#495057]">{notifications.total ? visibleTotalText : "Sin pendientes"}</p>
          </div>
          {notifications.items.length ? (
            <>
              <div className={cn("min-h-0 overflow-y-auto py-1 max-sm:flex-1 max-sm:max-h-none", expanded ? "max-h-[70vh]" : "max-h-[26rem]")}>
                {visibleItems.map((item) => {
                  const isRead = readKeys.has(item.notificationKey);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        markRead([item.notificationKey]);
                        setOpen(false);
                      }}
                      className={cn(
                        "block border-b border-[#f1f3f5] px-3 py-2.5 transition last:border-b-0",
                        isRead ? "bg-white hover:bg-[#f8f9fa]" : "bg-[#cfe8ff] hover:bg-[#9fd0ff]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-5 text-[#212529]">{item.title}</p>
                        <span className={cn("shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase", kindClass(item.kind))}>
                          {kindLabel(item.kind)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#495057]">{item.description}</p>
                      <p className="mt-1 text-[11px] font-medium text-[#212529]">{item.meta}</p>
                    </Link>
                  );
                })}
              </div>
              {hasMore ? (
                <div className="border-t border-[#dee2e6] bg-white p-2">
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => !current)}
                    className="w-full rounded-sm border border-[#ced4da] bg-[#f8f9fa] px-3 py-1.5 text-sm font-semibold text-[#212529] transition hover:bg-[#e9ecef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
                  >
                    {expanded ? "Ver menos" : `Ver mas (${notifications.items.length - collapsedCount})`}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="px-3 py-4 text-sm text-[#495057]">No hay eventos de agenda, plazos vencidos ni derivaciones activas para tu rol.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
