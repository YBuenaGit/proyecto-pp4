import type { ReactNode } from "react";
import { cn } from "./cn";

export function Table({
  headers,
  children,
  empty,
  minWidth = 960,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
  minWidth?: number;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse text-sm" style={{ minWidth }}>
          <thead className="bg-[#e9ecef]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border border-[#dee2e6] px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-normal text-[#495057]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white [&_tr:hover]:bg-[#d1ecf1]/60">{children}</tbody>
        </table>
      </div>
      {empty ? <div className="border-t border-[#dee2e6] px-4 py-8 text-center text-sm font-medium text-[#6c757d]">No hay registros para mostrar.</div> : null}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("whitespace-normal break-words border border-[#dee2e6] px-2.5 py-2 align-top text-[#212529] [overflow-wrap:anywhere]", className)}>{children}</td>;
}
