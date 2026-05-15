import type { ReactNode } from "react";
import { cn } from "./cn";

export function Table({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e4ee] bg-[#fbfdff]/[0.96] shadow-[0_18px_42px_rgba(26,68,104,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] table-fixed divide-y divide-[#d7e4ee] text-sm md:min-w-full [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-[#f4f9fc]">
          <thead className="bg-gradient-to-r from-[#f7fbfd] to-[#edf5f9]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-3 text-left text-xs font-semibold tracking-[0.12em] text-[#607589] sm:px-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6eef4] bg-white/[0.85]">{children}</tbody>
        </table>
      </div>
      {empty ? <div className="px-4 py-10 text-center text-sm font-medium text-[#607589]">No hay registros para mostrar.</div> : null}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("whitespace-normal break-words px-3 py-3 align-top text-[#334b5f] [overflow-wrap:anywhere] sm:px-4", className)}>{children}</td>;
}
