import { formatDateTime, labelFromValue } from "@/lib/format";

export function AuditTimeline({
  logs,
}: {
  logs: Array<{
    id: string;
    action: string;
    createdAt: Date;
    createdBy: { name: string; role: string } | null;
  }>;
}) {
  if (!logs.length) return <p className="text-sm text-slate-500">Sin eventos de auditoria registrados.</p>;

  return (
    <ol className="space-y-4">
      {logs.map((log) => (
        <li key={log.id} className="border-l-2 border-sky-200 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{labelFromValue(log.action)}</span>
            <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {log.createdBy ? `${log.createdBy.name} (${labelFromValue(log.createdBy.role)})` : "Sistema"}
          </p>
        </li>
      ))}
    </ol>
  );
}
