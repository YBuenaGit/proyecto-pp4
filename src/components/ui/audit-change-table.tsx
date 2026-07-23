import { formatDateTime } from "@/lib/format";
import type { AuditChangeRow } from "@/lib/audit-changes";
import { Table, Td } from "./table";

export function AuditChangeTable({
  rows,
  title = "Historial de cambios",
}: {
  rows: AuditChangeRow[];
  title?: string;
}) {
  return (
    <Table
      title={title}
      itemLabel="cambios"
      total={rows.length}
      showPagination={false}
      headers={[
        "Campo",
        "Valor anterior",
        "Valor nuevo",
        "Modificado por",
        "Fecha",
      ]}
      empty={!rows.length}
      minWidth={900}
      rowClick={false}
    >
      {rows.map((row) => (
        <tr key={row.id}>
          <Td className="font-semibold">{row.fieldLabel}</Td>
          <Td className="whitespace-pre-wrap text-left">{row.oldValue}</Td>
          <Td className="whitespace-pre-wrap text-left">{row.newValue}</Td>
          <Td>{row.modifiedBy}</Td>
          <Td>{formatDateTime(row.modifiedAt)}</Td>
        </tr>
      ))}
    </Table>
  );
}
