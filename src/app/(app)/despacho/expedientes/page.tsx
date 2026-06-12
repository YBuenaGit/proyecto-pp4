import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FileText, Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { EXPEDIENT_AREAS, EXPEDIENT_STATUSES } from "@/lib/constants";
import { CODIGOS_EXPEDIENTES, codigoExpedienteLabel } from "@/lib/constants/codigosExpedientes";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessExpedients } from "@/lib/rbac";
import { dateRangeWhere, pagination, param } from "@/lib/search";
import type { SearchParams } from "@/lib/types";
import { createExpedient } from "../actions";
import { ExpedientForm } from "./expedient-form";

type ExpedientPdf = {
  id: string;
  originalName: string;
  mimeType: string;
};

function isPdfAttachment(attachment: { mimeType: string; originalName: string }) {
  return attachment.mimeType === "application/pdf" || attachment.originalName.toLowerCase().endsWith(".pdf");
}

function rowNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

function PdfLinks({ attachments }: { attachments: ExpedientPdf[] }) {
  if (!attachments.length) return <span className="text-sm font-medium text-[#6c757d]">-</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {attachments.map((attachment, index) => (
        <Link
          key={attachment.id}
          href={`/adjuntos/${attachment.id}`}
          target="_blank"
          rel="noreferrer"
          title={attachment.originalName}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-[#b6cfeb] bg-[#e8f2ff] px-2 py-1 text-xs font-semibold text-[#0667b0] transition duration-150 hover:border-[#8ec5ff] hover:bg-[#d7ecff]"
        >
          <FileText className="h-3.5 w-3.5" />
          PDF {index + 1}
        </Link>
      ))}
    </div>
  );
}

export default async function ExpedientsListPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));

  const params = searchParams ? await searchParams : {};
  const from = param(params, "from");
  const to = param(params, "to");
  const category = param(params, "category");
  const area = param(params, "area");
  const status = param(params, "status");
  const expedienteNumber = param(params, "expedienteNumber");
  const codigo = param(params, "codigo");
  const { page, pageSize, skip, take } = pagination(params);

  const where: Prisma.InternalExpedientWhereInput = {
    ...(dateRangeWhere(from, to) ? { createdAt: dateRangeWhere(from, to) } : {}),
    ...(category ? { category } : {}),
    ...(area ? { area } : {}),
    ...(status ? { status } : {}),
    ...(expedienteNumber ? { expedienteNumber: { contains: expedienteNumber } } : {}),
    ...(codigo ? { codigo } : {}),
  };

  const [expedients, totalExpedients, categories] = await Promise.all([
    prisma.internalExpedient.findMany({
      where,
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.internalExpedient.count({ where }),
    prisma.catalogItem.findMany({
      where: { type: "expedient_category", active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const attachments = expedients.length
    ? await prisma.attachment.findMany({
        where: {
          entityType: "InternalExpedient",
          entityId: { in: expedients.map((expedient) => expedient.id) },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const pdfsByExpedient = new Map<string, ExpedientPdf[]>();
  const categoryLabels = new Map(categories.map((item) => [item.value, item.label]));
  const areaLabels = new Map(EXPEDIENT_AREAS.map((item) => [item.value, item.label]));

  for (const attachment of attachments) {
    if (!isPdfAttachment(attachment)) continue;

    const current = pdfsByExpedient.get(attachment.entityId) ?? [];
    current.push(attachment);
    pdfsByExpedient.set(attachment.entityId, current);
  }

  return (
    <>
      <PageHeader title="Despacho · Expedientes internos" />

      <div className="relative mb-5">
        <div className="mb-3 flex justify-end sm:absolute sm:right-0 sm:top-0 z-50 sm:mb-0">
          <AppModal
            title="Nuevo expediente interno"
            trigger={
              <>
                <Plus className="h-4 w-4" />
                Nuevo expediente
              </>
            }
            size="lg"
          >
            <ExpedientForm
              action={createExpedient}
              categories={categories.map((item) => ({ value: item.value, label: item.label }))}
              backHref="/despacho/expedientes"
              modal
              submitLabel="Crear"
            />
          </AppModal>
        </div>

        <FilterBar resetHref="/despacho/expedientes" label="Buscar expediente">
          <FilterInput label="Desde" name="from" type="date" defaultValue={from} />
          <FilterInput label="Hasta" name="to" type="date" defaultValue={to} />
          <FilterSelect label="Categoría" name="category" defaultValue={category} options={categories.map((item) => [item.value, item.label])} />
          <FilterSelect label="Área" name="area" defaultValue={area} options={EXPEDIENT_AREAS.map((item) => [item.value, item.label])} />
          <FilterSelect label="Código" name="codigo" defaultValue={codigo} options={CODIGOS_EXPEDIENTES.map((item) => [item.codigo, `${item.codigo} - ${item.descripcion}`])} />
          <FilterSelect label="Estado" name="status" defaultValue={status} options={EXPEDIENT_STATUSES.map((s) => [s, labelFromValue(s)])} />
          <FilterInput label="Nro expediente" name="expedienteNumber" defaultValue={expedienteNumber} />
        </FilterBar>
      </div>

      <Table
        title="Expedientes"
        itemLabel="expedientes"
        total={totalExpedients}
        page={page}
        pageSize={pageSize}
        headers={["Número", "Creado / Usuario", "Expediente / Código", "Categoría / Área", "Estado", "PDF"]}
        empty={!expedients.length}
        minWidth={900}
      >
        {expedients.map((expedient, index) => (
          <tr key={expedient.id}>
            <Td className="w-[72px] text-center">
              <Link href={`/despacho/expedientes/${expedient.id}`} className="whitespace-nowrap font-semibold text-[#0667b0] hover:underline">
                {rowNumber(skip + index)}
              </Link>
            </Td>

            <Td>
              <div className="font-medium text-[#212529]">{formatDateTime(expedient.createdAt)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">Usuario: {expedient.createdBy.name}</div>
            </Td>

            <Td>
              <div className="font-medium text-[#212529]">{expedient.expedienteNumber ?? "-"}</div>
              <div className="mt-1 text-xs text-[#6c757d]">{codigoExpedienteLabel(expedient.codigo)}</div>
            </Td>

            <Td>
              <div className="font-medium text-[#212529]">
                {categoryLabels.get(expedient.category) ?? labelFromValue(expedient.category)}
              </div>
              <div className="mt-1 text-xs font-semibold text-[#343a40]">
                Área: {areaLabels.get(expedient.area ?? "") ?? labelFromValue(expedient.area)}
              </div>
            </Td>

            <Td>
              <StatusBadge value={expedient.status} />
            </Td>

            <Td>
              <PdfLinks attachments={pdfsByExpedient.get(expedient.id) ?? []} />
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
