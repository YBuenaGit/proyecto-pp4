import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Download, Edit, FileText, Plus, Send } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { Button, LinkButton } from "@/components/ui/button";
import { DetailField, DetailSection, FieldGrid } from "@/components/ui/detail-section";
import { FormField, inputClass, textareaClass } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { DISPATCH_STATUSES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { chunkForBookPages, paginateBookTextSections, type BookTextBlock } from "@/lib/book-pagination";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch } from "@/lib/rbac";
import {
  addDispatchFollowUp,
  deriveDispatchToJuridical,
  updateDispatchRecord,
} from "../actions";
import { DispatchForm } from "../dispatch-form";
import { LegajoBookViewer, type LegajoBookItem } from "../../intervenciones/[id]/legajo-book-viewer";

type StoredLinkedPerson = {
  dni?: string | null;
  firstName?: string | null;
  apellidoApodoManual?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
};

function display(value: string | null | undefined) {
  return value?.trim() || "Sin dato";
}

function hasLinkedPersonData(person: StoredLinkedPerson) {
  return Boolean(person.dni || person.firstName || person.apellidoApodoManual || person.phone1 || person.phone2 || person.address);
}

type DispatchAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedBy: { name: string };
  isPrivate: boolean;
};

function BookField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-[#b7dfee] py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0c5460]">{label}</p>
      <div className="mt-0.5 text-sm font-semibold leading-6 text-[#212529]">{value || "-"}</div>
    </div>
  );
}

function BookText({ label, children }: { label: string; children: string | null | undefined }) {
  if (!children?.trim()) return null;
  return (
    <div className="rounded-sm border border-[#b7dfee] bg-[#f6fcff] px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">{label}</p>
      <p className="book-leaf-text mt-1 whitespace-pre-wrap text-[15px] leading-7 text-[#212529]">{children}</p>
    </div>
  );
}

function DispatchBookAttachments({ attachments }: { attachments: DispatchAttachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">Adjuntos del legajo</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <Link
            key={attachment.id}
            href={`/adjuntos/${attachment.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-start gap-2 rounded-sm border border-[#dee2e6] bg-white px-3 py-2 text-sm text-[#212529] transition hover:bg-[#e9ecef]"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#0667b0]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{attachment.originalName}</span>
              <span className="block text-xs text-[#6c757d]">{Math.ceil(attachment.size / 1024)} KB Â· {attachment.uploadedBy.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DispatchCoverSheet({
  record,
  category,
  textBlocks,
  pageNumber = 1,
  pageCount = 1,
}: {
  record: {
    internalNumber: string;
    category: string;
    priority: string;
    status: string;
    attendedAt: Date;
    createdAt: Date;
    createdBy: { name: string };
    origin: string;
    referredArea: string | null;
  };
  category: string;
  textBlocks: BookTextBlock[];
  pageNumber?: number;
  pageCount?: number;
}) {
  const isContinuation = pageNumber > 1;

  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-[#eefaff] shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
      <div className="border-b border-[#b7dfee] bg-[#dff3fb] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">Caratula{pageCount > 1 ? ` · hoja ${pageNumber} de ${pageCount}` : ""}</p>
            <h3 className="mt-1 text-lg font-semibold text-[#212529]">Atencion / reclamo</h3>
            <p className="mt-2 text-sm font-semibold text-[#0c5460]">Secretaria de Seguridad Municipal</p>
          </div>
          <div className="rounded-sm border border-[#86cfdf] bg-white px-3 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0c5460]">NÂ° de legajo</p>
            <p className="mt-1 text-base font-semibold text-[#212529]">{record.internalNumber}</p>
          </div>
        </div>
      </div>
      <div className="book-leaf-body space-y-3 px-4 py-4 sm:px-5">
        {!isContinuation ? (
          <>
            <div className="grid gap-3 rounded-sm border border-[#b7dfee] bg-white/80 p-3 sm:grid-cols-2">
              <BookField label="Categoria" value={category} />
              <BookField label="Fecha de atencion" value={formatDateTime(record.attendedAt)} />
              <BookField label="Usuario que atendio" value={record.createdBy.name} />
              <BookField label="Origen / area" value={`${labelFromValue(record.origin)} Â· ${record.referredArea ?? "-"}`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={record.status} />
              <StatusBadge value={record.priority} />
            </div>
          </>
        ) : (
          <div className="rounded-sm border border-[#b7dfee] bg-white/80 px-3 py-2 text-sm font-semibold text-[#0c5460]">
            Continuacion de atencion / reclamo
          </div>
        )}
        {textBlocks.length ? textBlocks.map((block, index) => <BookText key={`${block.label}-${index}`} label={block.label}>{block.text}</BookText>) : (
          <p className="rounded-sm border border-[#b7dfee] bg-white/70 px-3 py-3 text-sm font-medium text-[#6c757d]">Sin contenido textual cargado.</p>
        )}
      </div>
    </article>
  );
}

function DispatchAttachmentSheet({ attachments, pageNumber, pageCount }: { attachments: DispatchAttachment[]; pageNumber?: number; pageCount?: number }) {
  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-[#eefaff] shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
      <div className="border-b border-[#b7dfee] bg-[#dff3fb] px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">Archivos</p>
        <h3 className="mt-1 text-lg font-semibold text-[#212529]">Archivos del legajo{pageCount && pageCount > 1 ? ` · hoja ${pageNumber} de ${pageCount}` : ""}</h3>
        <p className="mt-1 text-sm text-[#6c757d]">Documentacion adjunta disponible para abrir o descargar.</p>
      </div>
      <div className="book-leaf-body px-4 py-4 sm:px-5">
        <DispatchBookAttachments attachments={attachments} />
      </div>
    </article>
  );
}

function DispatchFollowUpSheet({
  sheetNumber,
  statusAfter,
  createdAt,
  createdBy,
  textBlocks,
  pageNumber = 1,
  pageCount = 1,
}: {
  sheetNumber: number;
  statusAfter: string | null;
  createdAt: Date;
  createdBy: { name: string };
  textBlocks: BookTextBlock[];
  pageNumber?: number;
  pageCount?: number;
}) {
  const isContinuation = pageNumber > 1;

  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-[#eefaff] shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
      <div className="border-b border-[#b7dfee] bg-[#dff3fb] px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">
            Seguimiento NÂ° {sheetNumber}{pageCount > 1 ? ` · hoja ${pageNumber} de ${pageCount}` : ""}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#212529]">Seguimiento de atencion</h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#6c757d]">
            <span>{formatDateTime(createdAt)}</span>
            <span>Registrado por: {createdBy.name}</span>
          </div>
        </div>
      </div>
      <div className="book-leaf-body space-y-3 px-4 py-4 sm:px-5">
        {!isContinuation ? (
          <>
            <div className="grid gap-3 rounded-sm border border-[#b7dfee] bg-white/80 p-3 sm:grid-cols-2">
              <BookField label="Fecha y hora" value={formatDateTime(createdAt)} />
              <BookField label="Quien cargo" value={createdBy.name} />
            </div>
            {statusAfter ? <StatusBadge value={statusAfter} /> : null}
          </>
        ) : (
          <div className="rounded-sm border border-[#b7dfee] bg-white/80 px-3 py-2 text-sm font-semibold text-[#0c5460]">
            Continuacion del seguimiento
          </div>
        )}
        {textBlocks.length ? textBlocks.map((block, index) => <BookText key={`${block.label}-${index}`} label={block.label}>{block.text}</BookText>) : (
          <p className="rounded-sm border border-[#b7dfee] bg-white/70 px-3 py-3 text-sm font-medium text-[#6c757d]">Sin contenido textual cargado.</p>
        )}
      </div>
    </article>
  );
}

function DispatchReadModal({
  title,
  date,
  actor,
  content,
  statusAfter,
}: {
  title: string;
  date: Date;
  actor: string;
  content: string;
  statusAfter?: string | null;
}) {
  return (
    <AppModal title={title} trigger={<><FileText className="h-3.5 w-3.5" />Leer contenido</>} triggerVariant="subtle" size="lg" triggerClassName="min-h-8 px-2.5 py-1 text-xs">
      <div className="space-y-4">
        <div className="grid gap-3 rounded-sm border border-[#b7dfee] bg-[#eefaff] p-3 sm:grid-cols-2">
          <BookField label="Fecha y hora" value={formatDateTime(date)} />
          <BookField label="Quien cargo" value={actor} />
          <BookField label="Estado posterior" value={statusAfter ? <StatusBadge value={statusAfter} /> : "-"} />
        </div>
        <BookText label="Contenido">{content}</BookText>
      </div>
    </AppModal>
  );
}

export default async function DispatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const { id } = await params;

  const [record, attachments, auditLogs, categories, areas, juridicalTypes] = await Promise.all([
    prisma.dispatchRecord.findUnique({
      where: { id },
      include: {
        person: true,
        createdBy: true,
        complainants: { orderBy: { sortOrder: "asc" } },
        linkedPersons: { orderBy: { sortOrder: "asc" } },
        followUps: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
        originReferrals: {
          include: { destinationJuridicalIntervention: true, referredBy: true },
          orderBy: { referredAt: "desc" },
        },
        destinationReferrals: {
          include: { originJuridicalIntervention: true, referredBy: true },
          orderBy: { referredAt: "desc" },
        },
      },
    }),
    prisma.attachment.findMany({
      where: { entityType: "DispatchRecord", entityId: id },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "DispatchRecord", entityId: id },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_category", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "dispatch_area", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "juridical_type", active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!record) notFound();
  const complainants = record.complainants;
  const linkedPersons = record.linkedPersons.length
    ? record.linkedPersons
    : [
        {
          dni: record.dniSnapshot,
          firstName: record.person?.firstName,
          apellidoApodoManual: record.person?.lastName ?? record.nameSnapshot,
          phone1: record.person?.phone1,
          phone2: record.person?.phone2,
          address: record.person?.address,
        },
      ].filter(hasLinkedPersonData);
  const categoryLabel = categories.find((item) => item.value === record.category)?.label ?? labelFromValue(record.category);
  const followUpsForLegajo = [...record.followUps].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const bookEntries: Array<{ item: LegajoBookItem; node: ReactNode }> = [];
  const coverPages = paginateBookTextSections(
    [
      { label: "Descripcion del reclamo", text: record.description },
      { label: "Orientacion brindada", text: record.initialGuidance },
      { label: "Notas internas confidenciales", text: record.confidentialNotes },
    ],
    { firstPageLines: 10, continuationPageLines: 17 },
  );

  coverPages.forEach((textPage, pageIndex) => {
    bookEntries.push({
      item: {
        sheetNumber: 1,
        label: pageIndex > 0 ? `Caratula · cont. ${pageIndex + 1}` : "Caratula",
        title: "Datos principales",
        dateText: formatDateTime(record.attendedAt),
        statusText: record.status,
        searchText: [record.description, record.initialGuidance, record.confidentialNotes, record.createdBy.name, categoryLabel].filter(Boolean).join(" "),
      },
      node: (
        <DispatchCoverSheet
          key={`cover-${pageIndex}`}
          record={record}
          category={categoryLabel}
          textBlocks={textPage.blocks}
          pageNumber={pageIndex + 1}
          pageCount={coverPages.length}
        />
      ),
    });
  });

  if (attachments.length) {
    const attachmentPages = chunkForBookPages(attachments, 8);

    attachmentPages.forEach((attachmentPage, pageIndex) => {
      bookEntries.push({
        item: {
          sheetNumber: 1,
          label: attachmentPages.length > 1 ? `Archivos · hoja ${pageIndex + 1}` : "Archivos",
          title: "Archivos del legajo",
          dateText: formatDateTime(attachments[0]?.createdAt ?? record.createdAt),
          statusText: `${attachments.length} archivo${attachments.length === 1 ? "" : "s"}`,
          searchText: attachments.map((attachment) => attachment.originalName).join(" "),
        },
        node: (
          <DispatchAttachmentSheet
            key={`attachments-${pageIndex}`}
            attachments={attachmentPage}
            pageNumber={pageIndex + 1}
            pageCount={attachmentPages.length}
          />
        ),
      });
    });
  }

  followUpsForLegajo.forEach((followUp, index) => {
    const sheetNumber = index + 2;
    const followUpPages = paginateBookTextSections(
      [{ label: "Contenido del seguimiento", text: followUp.content }],
      { firstPageLines: 13, continuationPageLines: 19 },
    );

    followUpPages.forEach((textPage, pageIndex) => {
      bookEntries.push({
        item: {
          sheetNumber,
          label: pageIndex > 0 ? `Seguimiento NÂ° ${sheetNumber} · cont. ${pageIndex + 1}` : undefined,
          title: "Seguimiento de atencion",
          dateText: formatDateTime(followUp.createdAt),
          statusText: followUp.statusAfter,
          searchText: [followUp.content, followUp.createdBy.name, followUp.statusAfter].filter(Boolean).join(" "),
        },
        node: (
          <DispatchFollowUpSheet
            key={`follow-up-${followUp.id}-${pageIndex}`}
            sheetNumber={sheetNumber}
            statusAfter={followUp.statusAfter}
            createdAt={followUp.createdAt}
            createdBy={followUp.createdBy}
            textBlocks={textPage.blocks}
            pageNumber={pageIndex + 1}
            pageCount={followUpPages.length}
          />
        ),
      });
    });
  });

  const bookItems = bookEntries.map((entry) => entry.item);

  return (
    <>
      <section
        className="relative mb-5 overflow-hidden rounded-sm border border-[#b7dfee] bg-[#a1bbcf] p-3 text-[#212529] shadow-sm sm:p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">Expediente virtual Â· Atencion / reclamo</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#212529] sm:text-3xl">Legajo de despacho {record.internalNumber}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-[#b7dfee] bg-white px-2.5 py-1 text-sm font-semibold text-[#0c5460]">{categoryLabel}</span>
              <StatusBadge value={record.status} className="w-auto max-w-none" />
              <StatusBadge value={record.priority} className="w-auto max-w-none" />
              <span className="rounded-sm border border-[#b7dfee] bg-white px-2.5 py-1 text-sm font-semibold text-[#0c5460]">
                Atencion: {formatDateTime(record.attendedAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppModal title={`Editar datos generales ${record.internalNumber}`} trigger={<><Edit className="h-4 w-4" />Editar datos generales</>} triggerVariant="secondary" size="xl">
              <DispatchForm
                action={updateDispatchRecord.bind(null, record.id)}
                record={record}
                categories={categories.map((item) => ({ value: item.value, label: item.label }))}
                areas={areas.map((item) => ({ value: item.value, label: item.label }))}
                backHref={`/despacho/${record.id}`}
                modal
                submitLabel="Guardar cambios"
              />
            </AppModal>
            <AppModal title="Nuevo registro de atencion" trigger={<><Plus className="h-4 w-4" />Nueva intervencion</>} size="md">
              <form action={addDispatchFollowUp.bind(null, record.id)} className="space-y-4">
                <FormField label="Nuevo seguimiento">
                  <textarea name="content" className={textareaClass} required />
                </FormField>
                <FormField label="Estado posterior">
                  <select name="statusAfter" className={inputClass} defaultValue="">
                    <option value="">Sin cambio</option>
                    {DISPATCH_STATUSES.map((status) => (
                      <option key={status} value={status}>{labelFromValue(status)}</option>
                    ))}
                  </select>
                </FormField>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit">Guardar</Button>
                  <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                </div>
              </form>
            </AppModal>
            <AppModal title="Derivar a Intervenciones" trigger={<><Send className="h-4 w-4" />Derivar</>} triggerVariant="secondary" size="md">
              <form action={deriveDispatchToJuridical.bind(null, record.id)} className="space-y-4">
                <FormField label="Derivar a Intervenciones">
                  <textarea name="summary" className={textareaClass} placeholder="Resumen necesario para continuar la intervencion" required />
                </FormField>
                <FormField label="Tipo sugerido">
                  <select name="type" className={inputClass} defaultValue="PRIMERA_INTERVENCION">
                    {juridicalTypes.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </FormField>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit">Guardar</Button>
                  <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                </div>
              </form>
            </AppModal>
            <AppModal title="Historial completo de auditoria" trigger={<><FileText className="h-4 w-4" />Auditoria</>} triggerVariant="secondary" size="lg">
              <AuditTimeline logs={auditLogs} />
            </AppModal>
            <LinkButton href={`/despacho/${record.id}/legajo.pdf`} variant="secondary" target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Descargar legajo PDF
            </LinkButton>
            <LinkButton href="/despacho" variant="secondary">Volver</LinkButton>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DetailSection title="Datos principales">
          <FieldGrid>
            <DetailField label="Estado" value={<StatusBadge value={record.status} />} />
            <DetailField label="Prioridad" value={<StatusBadge value={record.priority} />} />
            <DetailField label="Categoria" value={categoryLabel} />
            <DetailField label="Fecha de atencion" value={formatDateTime(record.attendedAt)} />
            <DetailField label="Carga en sistema" value={formatDateTime(record.createdAt)} />
            <DetailField label="Usuario que atendio" value={record.createdBy.name} />
            <DetailField label="Origen" value={labelFromValue(record.origin)} />
            <DetailField label="Area derivada" value={record.referredArea} />
            <DetailField label="Ultimo estado" value={formatDateTime(record.lastStatusAt)} />
          </FieldGrid>
        </DetailSection>

        <DetailSection title="Personas vinculadas">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl bg-[#f6fafc] p-3 ring-1 ring-[#d7e4ee]">
              <h3 className="text-sm font-semibold text-[#212529]">Personas denunciantes</h3>
              <div className="mt-3 space-y-3">
                {complainants.length ? complainants.map((complainant, index) => (
                  <div key={`complainant-${index}`} className="rounded-lg bg-white px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ring-[#e4edf4]">
                    {complainant.isAnonymous ? (
                      <p className="font-semibold text-[#212529]">Denunciante anonimo</p>
                    ) : (
                      <>
                        <p className="font-semibold text-[#212529]">{display([complainant.firstName, complainant.lastName].filter(Boolean).join(" "))}</p>
                        <p className="text-[#607589]">DNI: {display(complainant.dni)}</p>
                        <p className="text-[#607589]">Telefono: {display([complainant.phone1, complainant.phone2].filter(Boolean).join(" / "))}</p>
                        <p className="text-[#607589]">Domicilio: {display(complainant.address)}</p>
                      </>
                    )}
                  </div>
                )) : <p className="text-sm text-[#607589]">Sin denunciantes cargados.</p>}
              </div>
            </div>

            <div className="rounded-xl bg-[#f6fafc] p-3 ring-1 ring-[#d7e4ee]">
              <h3 className="text-sm font-semibold text-[#212529]">Personas denunciadas / vinculadas</h3>
              <div className="mt-3 space-y-3">
                {linkedPersons.length ? linkedPersons.map((person, index) => (
                  <div key={`linked-person-${index}`} className="rounded-lg bg-white px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ring-[#e4edf4]">
                    <p className="font-semibold text-[#212529]">{display([person.firstName, person.apellidoApodoManual].filter(Boolean).join(" "))}</p>
                    <p className="text-[#607589]">DNI: {display(person.dni)}</p>
                    <p className="text-[#607589]">Telefono: {display([person.phone1, person.phone2].filter(Boolean).join(" / "))}</p>
                    <p className="text-[#607589]">Domicilio: {display(person.address)}</p>
                    {index === 0 && record.personId ? (
                      <Link className="mt-1 inline-block font-semibold text-[#0667b0] hover:underline" href={`/personas/${record.personId}`}>Ver persona</Link>
                    ) : null}
                  </div>
                )) : <p className="text-sm text-[#607589]">Sin personas denunciadas o vinculadas cargadas.</p>}
              </div>
            </div>
          </div>
        </DetailSection>
      </section>

      <DetailSection
        title="Atenciones / seguimientos del legajo"
        action={
          <LegajoBookViewer
            items={bookItems}
            title="Expediente virtual ? Atencion / reclamo"
            itemLabel="Seguimiento"
            headerAction={
              <AppModal title="Agregar seguimiento" trigger={<><Plus className="h-4 w-4" />Agregar seguimiento</>} triggerVariant="secondary" size="md">
                <form action={addDispatchFollowUp.bind(null, record.id)} className="space-y-4">
                  <FormField label="Nuevo seguimiento">
                    <textarea name="content" className={textareaClass} required />
                  </FormField>
                  <FormField label="Estado posterior">
                    <select name="statusAfter" className={inputClass} defaultValue="">
                      <option value="">Sin cambio</option>
                      {DISPATCH_STATUSES.map((status) => (
                        <option key={status} value={status}>{labelFromValue(status)}</option>
                      ))}
                    </select>
                  </FormField>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit">Guardar</Button>
                    <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                  </div>
                </form>
              </AppModal>
            }
          >
            {bookEntries.map((entry) => entry.node)}
          </LegajoBookViewer>
        }
      >
        <Table
          title="Atenciones / seguimientos del legajo"
          itemLabel="registros"
          total={followUpsForLegajo.length + 1}
          showPagination={false}
          rowClick={false}
          headers={["Registro", "Fecha / usuario", "Actuacion", "Estado / seguimiento", "Archivo"]}
          minWidth={980}
        >
          {followUpsForLegajo.map((followUp, index) => (
            <tr key={followUp.id}>
              <Td className="w-[150px]">
                <span className="block font-semibold text-[#0667b0]">Seguimiento N? {index + 2}</span>
                <span className="mt-0.5 block text-xs text-[#6c757d]">Registro agregado</span>
              </Td>
              <Td className="w-[210px]">
                <span className="block font-semibold">{formatDateTime(followUp.createdAt)}</span>
                <span className="mt-0.5 block text-xs text-[#6c757d]">{followUp.createdBy.name}</span>
              </Td>
              <Td>
                <span className="block font-semibold">Seguimiento de atencion</span>
                <p className="mt-1 max-w-2xl whitespace-pre-wrap text-xs leading-5 text-[#495057]">{followUp.content}</p>
                <div className="mt-2">
                  <DispatchReadModal title={`Seguimiento N? ${index + 2}`} date={followUp.createdAt} actor={followUp.createdBy.name} content={followUp.content} statusAfter={followUp.statusAfter} />
                </div>
              </Td>
              <Td className="w-[230px]">
                {followUp.statusAfter ? <StatusBadge value={followUp.statusAfter} /> : <span className="text-sm text-[#6c757d]">Sin cambio de estado</span>}
              </Td>
              <Td className="w-[180px]"><span className="text-sm text-[#6c757d]">-</span></Td>
            </tr>
          ))}

          <tr>
            <Td className="w-[150px]">
              <span className="block font-semibold text-[#0667b0]">Atencion N? 1</span>
              <span className="mt-0.5 block text-xs text-[#6c757d]">Primera atencion</span>
            </Td>
            <Td className="w-[210px]">
              <span className="block font-semibold">{formatDateTime(record.attendedAt)}</span>
              <span className="mt-0.5 block text-xs text-[#6c757d]">{record.createdBy.name}</span>
            </Td>
            <Td>
              <span className="block font-semibold">{categoryLabel}</span>
              <p className="mt-1 max-w-2xl whitespace-pre-wrap text-xs leading-5 text-[#495057]">{record.description}</p>
              <div className="mt-2">
                <DispatchReadModal title="Atencion N? 1" date={record.attendedAt} actor={record.createdBy.name} content={record.description} statusAfter={record.status} />
              </div>
            </Td>
            <Td className="w-[230px]"><StatusBadge value={record.status} /></Td>
            <Td className="w-[180px]">
              <div className="flex flex-col items-start gap-2">
                {attachments.map((attachment) => (
                  <LinkButton key={attachment.id} href={`/adjuntos/${attachment.id}`} variant="secondary" target="_blank" rel="noreferrer" className="min-h-8 px-2.5 py-1 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    Archivo
                  </LinkButton>
                ))}
                {!attachments.length ? <span className="text-sm text-[#6c757d]">-</span> : null}
              </div>
            </Td>
          </tr>
        </Table>
      </DetailSection>
    </>
  );
}
