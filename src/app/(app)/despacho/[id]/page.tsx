import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CheckCheck, Download, Edit, FileText, Plus, Send } from "lucide-react";
import { ReferralViewTracker } from "@/components/referral-view-tracker";
import { AppModal } from "@/components/ui/app-modal";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { Button, LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  DetailField,
  DetailSection,
  FieldGrid,
} from "@/components/ui/detail-section";
import { FormField, inputClass } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessToast } from "@/components/ui/success-toast";
import { Table, Td } from "@/components/ui/table";
import { LegajoBookAttachmentSheet } from "@/components/ui/legajo-book-attachment-sheet";
import {
  LegajoAttachmentCount,
  LegajoAttachmentList,
} from "@/components/ui/legajo-attachments";
import {
  LegajoObservationCell,
  LegajoObservationList,
  type LegajoObservationItem,
} from "@/components/ui/legajo-observations";
import {
  flattenObservationAttachments,
  LegajoObservationAttachmentSheet,
} from "@/components/ui/legajo-observation-attachment-sheet";
import { DISPATCH_INTERNAL_DERIVED_AREAS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import {
  chunkForBookPages,
  paginateBookTextSections,
} from "@/lib/book-pagination";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { parseJuridicalActionContent } from "@/lib/juridical-action-content";
import { prisma } from "@/lib/prisma";
import {
  earliestDate,
  isVisibleBeforeReferralCutoff,
} from "@/lib/referral-privacy";
import {
  isInternalReferralModule,
  referralIdsToMarkForLegajo,
} from "@/lib/referral-view-rules";
import {
  assertAccess,
  canAccessDispatch,
  canBypassLegajoRestriction,
} from "@/lib/rbac";
import { personDisplayName, sortByLabel } from "@/lib/text";
import type { SearchParams } from "@/lib/types";
import {
  addDispatchFollowUp,
  addDispatchObservation,
  referDispatchToArea,
  updateDispatchRecord,
} from "../actions";
import { DispatchForm } from "../dispatch-form";
import { AddDispatchFollowUpForm } from "./add-dispatch-followup-form";
import {
  LegajoBookViewer,
  type LegajoBookItem,
} from "../../intervenciones/[id]/legajo-book-viewer";
import { LegajoInterventionRow } from "../../intervenciones/[id]/legajo-intervention-row";
import {
  BookSectionCover,
  BookContentSheet,
} from "../../intervenciones/[id]/legajo-book-sheets";

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
  return Boolean(
    person.dni ||
    person.firstName ||
    person.apellidoApodoManual ||
    person.phone1 ||
    person.phone2 ||
    person.address,
  );
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0c5460]">
        {label}
      </p>
      <div className="mt-0.5 text-sm font-semibold leading-6 text-[#212529]">
        {value || "-"}
      </div>
    </div>
  );
}

function BookText({
  label,
  children,
}: {
  label: string;
  children: string | null | undefined;
}) {
  if (!children?.trim()) return null;
  return (
    <div className="rounded-sm border border-[#b7dfee] bg-[#f6fcff] px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">
        {label}
      </p>
      <p className="book-leaf-text mt-1 whitespace-pre-wrap text-[15px] leading-7 text-[#212529]">
        {children}
      </p>
    </div>
  );
}

function DispatchReadContent({
  date,
  deadlineAt,
  actor,
  statusAfter,
  description,
  guidance,
  confidentialNotes,
  attachments,
  observations,
}: {
  date: Date;
  deadlineAt?: Date | null;
  actor: string;
  statusAfter?: string | null;
  description: string;
  guidance?: string | null;
  confidentialNotes?: string | null;
  attachments: DispatchAttachment[];
  observations: LegajoObservationItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-sm border border-[#b7dfee] bg-[#eefaff] p-3 sm:grid-cols-2">
        <BookField label="Fecha y hora" value={formatDateTime(date)} />
        <BookField
          label="Plazo"
          value={deadlineAt ? formatDateTime(deadlineAt) : "-"}
        />
        <BookField label="Quien cargo" value={actor} />
        <BookField
          label="Estado posterior"
          value={statusAfter ? <StatusBadge value={statusAfter} /> : "-"}
        />
      </div>
      <BookText label="Descripcion / relato">{description}</BookText>
      <BookText label="Intervencion realizada / orientacion brindada">
        {guidance}
      </BookText>
      <BookText label="Notas internas confidenciales">
        {confidentialNotes}
      </BookText>
      <div className="rounded-sm border border-amber-200 bg-amber-50/50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
          Observaciones posteriores
        </p>
        <LegajoObservationList observations={observations} />
      </div>
      <LegajoAttachmentList attachments={attachments} />
    </div>
  );
}

function dispatchDerivationDestination(record: {
  referredArea: string | null;
  originReferrals: { destinationModule: string }[];
}) {
  if (record.referredArea) return record.referredArea;
  const destinationModule = record.originReferrals[0]?.destinationModule;
  if (destinationModule === "JURIDICO")
    return "Intervenciones Juridico-Institucionales";
  if (destinationModule === "DIRECTIVO") return "Directivo";
  if (destinationModule === "DESPACHO") return "Despacho";
  return destinationModule
    ? labelFromValue(destinationModule)
    : "area derivada";
}

export default async function DispatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const showReferralToast = query.derivacion === "ok";

  const [record, categories, areas] = await Promise.all([
    prisma.dispatchRecord.findUnique({
      where: { id },
      include: {
        person: true,
        createdBy: true,
        complainants: { orderBy: { sortOrder: "asc" } },
        linkedPersons: { orderBy: { sortOrder: "asc" } },
        followUps: {
          include: { createdBy: true },
          orderBy: { createdAt: "desc" },
        },
        originReferrals: {
          include: {
            destinationJuridicalIntervention: true,
            referredBy: true,
            viewedBy: { select: { name: true } },
          },
          orderBy: { referredAt: "desc" },
        },
        destinationReferrals: {
          include: { originJuridicalIntervention: true, referredBy: true },
          orderBy: { referredAt: "desc" },
        },
      },
    }),
    prisma.catalogItem.findMany({
      where: { type: "dispatch_category", active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.catalogItem.findMany({
      where: { type: "dispatch_area", active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!record) notFound();

  const isDerivationFollowUp = (followUp: {
    content: string;
    statusAfter: string | null;
  }) =>
    followUp.statusAfter === "DERIVADO" ||
    followUp.content.toLocaleLowerCase("es-AR").startsWith("deriv");
  const outgoingReferralAt = earliestDate(
    record.originReferrals.map((referral) => referral.referredAt),
  );
  const derivationFollowUpAt = earliestDate(
    record.followUps
      .filter(isDerivationFollowUp)
      .map((followUp) => followUp.createdAt),
  );
  const privacyCutoffAt = earliestDate([
    outgoingReferralAt,
    derivationFollowUpAt,
  ]);
  const isOriginRestricted = Boolean(
    record.originReferrals.length ||
    (record.referredArea && record.status === "DERIVADO"),
  );
  const derivationDestination = isOriginRestricted
    ? dispatchDerivationDestination(record)
    : null;
  const outgoingInternalReferral = record.originReferrals.find((referral) =>
    isInternalReferralModule(referral.destinationModule),
  );
  const referralIdsToMark = referralIdsToMarkForLegajo({
    referrals: [...record.originReferrals, ...record.destinationReferrals],
    userId: user.id,
    userRole: user.role,
    legajoModule: "DESPACHO",
    legajoId: record.id,
  });
  const canBypassOriginRestriction = canBypassLegajoRestriction(user);
  const canMutateOriginLegajo =
    canBypassOriginRestriction || !isOriginRestricted;
  const visibleFollowUps = canBypassOriginRestriction
    ? record.followUps
    : record.followUps.filter((followUp) =>
        isVisibleBeforeReferralCutoff(
          followUp,
          privacyCutoffAt,
          isDerivationFollowUp,
        ),
      );
  const auditLogWhere =
    canBypassOriginRestriction || !privacyCutoffAt
      ? { entityType: "DispatchRecord", entityId: id }
      : {
          entityType: "DispatchRecord",
          entityId: id,
          OR: [{ createdAt: { lte: privacyCutoffAt } }, { action: "REFERRAL" }],
        };
  const referralAreas = sortByLabel(
    [
      ...areas.map((item) => ({ value: item.value, label: item.label })),
      ...DISPATCH_INTERNAL_DERIVED_AREAS,
    ].filter(
      (item, index, items) =>
        items.findIndex(
          (candidate) =>
            candidate.label.toLocaleLowerCase("es-AR") ===
            item.label.toLocaleLowerCase("es-AR"),
        ) === index,
    ),
    (item) => item.label,
  );
  const followUpIds = visibleFollowUps.map((followUp) => followUp.id);
  const [attachments, auditLogs, observations] = await Promise.all([
    prisma.attachment.findMany({
      where: {
        module: "DESPACHO",
        OR: [
          { entityType: "DispatchRecord", entityId: id },
          ...(followUpIds.length
            ? [
                {
                  entityType: "DispatchFollowUp",
                  entityId: { in: followUpIds },
                },
              ]
            : []),
        ],
      },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: auditLogWhere,
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.legajoObservation.findMany({
      where: {
        module: "DESPACHO",
        ...(canBypassOriginRestriction || !privacyCutoffAt
          ? {}
          : { createdAt: { lte: privacyCutoffAt } }),
        OR: [
          { entityType: "DispatchRecord", entityId: id },
          ...(followUpIds.length
            ? [
                {
                  entityType: "DispatchFollowUp",
                  entityId: { in: followUpIds },
                },
              ]
            : []),
        ],
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const observationAttachments = observations.length
    ? await prisma.attachment.findMany({
        where: {
          module: "DESPACHO",
          entityType: "LegajoObservation",
          entityId: { in: observations.map((observation) => observation.id) },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const attachmentsByObservationId = new Map<
    string,
    Array<{ id: string; originalName: string; mimeType: string }>
  >();
  observationAttachments.forEach((attachment) => {
    const current = attachmentsByObservationId.get(attachment.entityId) ?? [];
    current.push({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    });
    attachmentsByObservationId.set(attachment.entityId, current);
  });
  const observationItems: LegajoObservationItem[] = observations.map(
    (observation) => ({
      ...observation,
      attachments: attachmentsByObservationId.get(observation.id) ?? [],
    }),
  );

  const generalAttachments = attachments.filter(
    (attachment) => attachment.entityType === "DispatchRecord",
  );
  const attachmentsByFollowUpId = new Map<string, DispatchAttachment[]>();
  attachments
    .filter((attachment) => attachment.entityType === "DispatchFollowUp")
    .forEach((attachment) => {
      const current = attachmentsByFollowUpId.get(attachment.entityId) ?? [];
      current.push(attachment);
      attachmentsByFollowUpId.set(attachment.entityId, current);
    });
  const recordObservations = observationItems.filter(
    (observation) => observation.entityType === "DispatchRecord",
  );
  const observationsByFollowUpId = new Map<string, LegajoObservationItem[]>();
  observationItems
    .filter((observation) => observation.entityType === "DispatchFollowUp")
    .forEach((observation) => {
      const current = observationsByFollowUpId.get(observation.entityId) ?? [];
      current.push(observation);
      observationsByFollowUpId.set(observation.entityId, current);
    });
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
  const categoryLabel =
    categories.find((item) => item.value === record.category)?.label ??
    labelFromValue(record.category);
  const followUpsForLegajo = [...visibleFollowUps].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const followUpRows = followUpsForLegajo.map((followUp, index) => ({
    followUp,
    sheetNumber: index + 2,
  }));
  const displayFollowUpRows = [...followUpRows].reverse();
  const bookEntries: Array<{ item: LegajoBookItem; node: ReactNode }> = [];
  const legajoEyebrow = `Legajo ${record.internalNumber}`;
  const recordObservationAttachments =
    flattenObservationAttachments(recordObservations);

  function appendAttachmentPages({
    attachments,
    sheetNumber,
    selectionLabel,
    sectionLabel,
    title,
    dateText,
    keyPrefix,
  }: {
    attachments: DispatchAttachment[];
    sheetNumber: number;
    selectionLabel: string;
    sectionLabel: string;
    title: string;
    dateText: string;
    keyPrefix: string;
  }) {
    const attachmentPages = chunkForBookPages(attachments, 6);

    attachmentPages.forEach((attachmentPage, pageIndex) => {
      if (!attachmentPage.length) return;

      bookEntries.push({
        item: {
          sheetNumber,
          label:
            attachmentPages.length > 1
              ? `${selectionLabel} · hoja ${pageIndex + 1}`
              : selectionLabel,
          title,
          dateText,
          statusText: `${attachments.length} archivo${attachments.length === 1 ? "" : "s"}`,
          searchText: attachmentPage
            .flatMap((attachment) => [
              attachment.originalName,
              attachment.uploadedBy.name,
            ])
            .join(" "),
        },
        node: (
          <LegajoBookAttachmentSheet
            key={`${keyPrefix}-${pageIndex}`}
            attachments={attachmentPage}
            sectionLabel={sectionLabel}
            title={title}
            pageNumber={pageIndex + 1}
            pageCount={attachmentPages.length}
            totalAttachments={attachments.length}
          />
        ),
      });
    });
  }

  bookEntries.push({
    item: {
      sheetNumber: 1,
      label: "Primera atencion",
      title: categoryLabel,
      dateText: formatDateTime(record.attendedAt),
      statusText: record.status,
      searchText: [record.internalNumber, categoryLabel, record.createdBy.name]
        .filter(Boolean)
        .join(" "),
    },
    node: (
      <BookSectionCover
        key="cover-primera-atencion"
        eyebrow={legajoEyebrow}
        ordinal="Primera atencion"
        subtitle={categoryLabel}
        meta={[
          {
            label: "Estado",
            value: (
              <StatusBadge
                value={record.status}
                className="w-auto max-w-none"
              />
            ),
          },
          {
            label: "Prioridad",
            value: (
              <StatusBadge
                value={record.priority}
                className="w-auto max-w-none"
              />
            ),
          },
          {
            label: "Fecha de atencion",
            value: formatDateTime(record.attendedAt),
          },
          { label: "Usuario que atendio", value: record.createdBy.name },
          { label: "Origen", value: labelFromValue(record.origin) },
          ...(record.referredArea
            ? [{ label: "Area derivada", value: record.referredArea }]
            : []),
        ]}
      />
    ),
  });

  const coverPages = paginateBookTextSections(
    [
      { label: "Descripcion del reclamo", text: record.description },
      { label: "Orientacion brindada", text: record.initialGuidance },
      {
        label: "Notas internas confidenciales",
        text: record.confidentialNotes,
      },
      ...recordObservations.map((observation) => ({
        label: `Observacion · ${formatDateTime(observation.createdAt)} · ${observation.createdBy.name}`,
        text: observation.content,
      })),
    ],
    { firstPageLines: 24, continuationPageLines: 28 },
  );

  coverPages.forEach((textPage, pageIndex) => {
    bookEntries.push({
      item: {
        sheetNumber: 1,
        label:
          pageIndex > 0
            ? `Primera atencion · cont. ${pageIndex + 1}`
            : "Primera atencion · contenido",
        title: categoryLabel,
        dateText: formatDateTime(record.attendedAt),
        statusText: record.status,
        searchText: [
          record.description,
          record.initialGuidance,
          record.confidentialNotes,
          ...recordObservations.flatMap((observation) => [
            observation.content,
            observation.createdBy.name,
            ...observation.attachments.map(
              (attachment) => attachment.originalName,
            ),
          ]),
        ]
          .filter(Boolean)
          .join(" "),
      },
      node: (
        <BookContentSheet
          key={`cover-${pageIndex}`}
          sectionLabel="Primera atencion"
          textBlocks={textPage.blocks}
          pageNumber={pageIndex + 1}
          pageCount={coverPages.length}
        />
      ),
    });
  });

  appendAttachmentPages({
    attachments: generalAttachments,
    sheetNumber: 1,
    selectionLabel: "Primera atencion · archivos",
    sectionLabel: "Primera atencion",
    title: "Archivos de la primera atencion",
    dateText: formatDateTime(record.attendedAt),
    keyPrefix: "initial-attachments",
  });

  const recordObservationAttachmentPages = chunkForBookPages(
    recordObservationAttachments,
    6,
  );

  recordObservationAttachmentPages.forEach((attachmentPage, pageIndex) => {
    if (!attachmentPage.length) return;

    bookEntries.push({
      item: {
        sheetNumber: 1,
        label:
          recordObservationAttachmentPages.length > 1
            ? `Primera atencion · archivos de observaciones · hoja ${pageIndex + 1}`
            : "Primera atencion · archivos de observaciones",
        title: categoryLabel,
        dateText: formatDateTime(record.attendedAt),
        statusText: `${recordObservationAttachments.length} archivo${recordObservationAttachments.length === 1 ? "" : "s"}`,
        searchText: attachmentPage
          .flatMap((attachment) => [
            attachment.originalName,
            attachment.observationContent,
            attachment.observationCreatedBy,
          ])
          .join(" "),
      },
      node: (
        <LegajoObservationAttachmentSheet
          key={`record-observation-attachments-${pageIndex}`}
          sectionLabel="Primera atencion"
          attachments={attachmentPage}
          pageNumber={pageIndex + 1}
          pageCount={recordObservationAttachmentPages.length}
        />
      ),
    });
  });

  followUpsForLegajo.forEach((followUp, index) => {
    const sheetNumber = index + 2;
    const parsed = parseJuridicalActionContent(followUp.content);
    const followUpAttachments = attachmentsByFollowUpId.get(followUp.id) ?? [];
    const followUpObservations =
      observationsByFollowUpId.get(followUp.id) ?? [];
    const followUpObservationAttachments =
      flattenObservationAttachments(followUpObservations);
    const sectionLabel = `Seguimiento N° ${sheetNumber}`;
    const followUpPages = paginateBookTextSections(
      [
        { label: "Descripcion / relato", text: parsed.description },
        {
          label: "Intervencion realizada / orientacion brindada",
          text: parsed.guidanceProvided,
        },
        ...followUpObservations.map((observation) => ({
          label: `Observacion · ${formatDateTime(observation.createdAt)} · ${observation.createdBy.name}`,
          text: observation.content,
        })),
      ],
      { firstPageLines: 24, continuationPageLines: 28 },
    );

    bookEntries.push({
      item: {
        sheetNumber,
        label: sectionLabel,
        title: "Seguimiento de atencion",
        dateText: formatDateTime(followUp.createdAt),
        statusText: followUp.statusAfter,
        searchText: [followUp.createdBy.name, followUp.statusAfter]
          .filter(Boolean)
          .join(" "),
      },
      node: (
        <BookSectionCover
          key={`cover-follow-up-${followUp.id}`}
          eyebrow={legajoEyebrow}
          ordinal={sectionLabel}
          subtitle="Seguimiento de atencion"
          meta={[
            { label: "Fecha", value: formatDateTime(followUp.createdAt) },
            { label: "Registrado por", value: followUp.createdBy.name },
            ...(followUp.statusAfter
              ? [
                  {
                    label: "Estado",
                    value: (
                      <StatusBadge
                        value={followUp.statusAfter}
                        className="w-auto max-w-none"
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      ),
    });

    followUpPages.forEach((textPage, pageIndex) => {
      bookEntries.push({
        item: {
          sheetNumber,
          label:
            pageIndex > 0
              ? `${sectionLabel} · cont. ${pageIndex + 1}`
              : `${sectionLabel} · contenido`,
          title: "Seguimiento de atencion",
          dateText: formatDateTime(followUp.createdAt),
          statusText: followUp.statusAfter,
          searchText: [
            parsed.description,
            parsed.guidanceProvided,
            ...followUpObservations.flatMap((observation) => [
              observation.content,
              observation.createdBy.name,
              ...observation.attachments.map(
                (attachment) => attachment.originalName,
              ),
            ]),
          ]
            .filter(Boolean)
            .join(" "),
        },
        node: (
          <BookContentSheet
            key={`follow-up-${followUp.id}-${pageIndex}`}
            sectionLabel={sectionLabel}
            textBlocks={textPage.blocks}
            pageNumber={pageIndex + 1}
            pageCount={followUpPages.length}
          />
        ),
      });
    });

    appendAttachmentPages({
      attachments: followUpAttachments,
      sheetNumber,
      selectionLabel: `${sectionLabel} · archivos`,
      sectionLabel,
      title: `Archivos de ${sectionLabel}`,
      dateText: formatDateTime(followUp.createdAt),
      keyPrefix: `follow-up-attachments-${followUp.id}`,
    });

    const followUpObservationAttachmentPages = chunkForBookPages(
      followUpObservationAttachments,
      6,
    );

    followUpObservationAttachmentPages.forEach((attachmentPage, pageIndex) => {
      if (!attachmentPage.length) return;

      bookEntries.push({
        item: {
          sheetNumber,
          label:
            followUpObservationAttachmentPages.length > 1
              ? `${sectionLabel} · archivos de observaciones · hoja ${pageIndex + 1}`
              : `${sectionLabel} · archivos de observaciones`,
          title: "Seguimiento de atencion",
          dateText: formatDateTime(followUp.createdAt),
          statusText: `${followUpObservationAttachments.length} archivo${followUpObservationAttachments.length === 1 ? "" : "s"}`,
          searchText: attachmentPage
            .flatMap((attachment) => [
              attachment.originalName,
              attachment.observationContent,
              attachment.observationCreatedBy,
            ])
            .join(" "),
        },
        node: (
          <LegajoObservationAttachmentSheet
            key={`follow-up-observation-attachments-${followUp.id}-${pageIndex}`}
            sectionLabel={sectionLabel}
            attachments={attachmentPage}
            pageNumber={pageIndex + 1}
            pageCount={followUpObservationAttachmentPages.length}
          />
        ),
      });
    });
  });

  const bookItems = bookEntries.map((entry) => entry.item);

  return (
    <>
      {referralIdsToMark.length ? (
        <ReferralViewTracker
          referralIds={referralIdsToMark}
          legajoModule="DESPACHO"
          legajoId={record.id}
        />
      ) : null}
      {showReferralToast ? <SuccessToast /> : null}
      <section className="relative mb-5 overflow-hidden rounded-sm border border-[#b7dfee] bg-[#a1bbcf] p-3 text-[#212529] shadow-sm sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">
              Expediente virtual Â· Atencion / reclamo
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#212529] sm:text-3xl">
              Legajo de despacho {record.internalNumber}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-[#b7dfee] bg-white px-2.5 py-1 text-sm font-semibold text-[#0c5460]">
                {categoryLabel}
              </span>
              <StatusBadge
                value={record.status}
                className="w-auto max-w-none"
              />
              <StatusBadge
                value={record.priority}
                className="w-auto max-w-none"
              />
              <span className="rounded-sm border border-[#b7dfee] bg-white px-2.5 py-1 text-sm font-semibold text-[#0c5460]">
                Atencion: {formatDateTime(record.attendedAt)}
              </span>
              {derivationDestination ? (
                <span className="rounded-sm border border-[#f1aeb5] bg-[#f8d7da] px-2.5 py-1 text-sm font-bold uppercase text-[#842029]">
                  Derivado al area: {derivationDestination}
                </span>
              ) : null}
              {outgoingInternalReferral?.viewedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#a3cfbb] bg-[#d1e7dd] px-2.5 py-1 text-sm font-semibold text-[#0a3622]">
                  <CheckCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Visto{outgoingInternalReferral.viewedBy?.name ? ` por ${outgoingInternalReferral.viewedBy.name}` : ""}
                  {` · ${formatDateTime(outgoingInternalReferral.viewedAt)}`}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppModal
              title={`Editar datos generales ${record.internalNumber}`}
              trigger={
                <>
                  <Edit className="h-4 w-4" />
                  Editar datos generales
                </>
              }
              triggerVariant="secondary"
              size="xl"
            >
              <DispatchForm
                action={updateDispatchRecord.bind(null, record.id)}
                record={record}
                categories={categories.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                areas={areas.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                backHref={`/despacho/${record.id}`}
                modal
                submitLabel="Guardar cambios"
                mode="general-edit"
              />
            </AppModal>
            {canMutateOriginLegajo ? (
              <AppModal
                title="Nuevo registro de atencion"
                description="Crea un nuevo seguimiento documental dentro de este legajo."
                trigger={
                  <>
                    <Plus className="h-4 w-4" />
                    Nueva intervencion
                  </>
                }
                size="md"
              >
                <AddDispatchFollowUpForm
                  action={addDispatchFollowUp.bind(null, record.id)}
                  recordId={record.id}
                  submitLabel="Crear intervencion"
                />
              </AppModal>
            ) : null}
            {!isOriginRestricted ? (
              <>
                <AppModal
                  title="Derivaciones"
                  trigger={
                    <>
                      <Send className="h-4 w-4" />
                      Derivar
                    </>
                  }
                  triggerVariant="secondary"
                  size="md"
                >
                  <form
                    action={referDispatchToArea.bind(null, record.id)}
                    className="space-y-4"
                  >
                    <FormField label="Area a derivar">
                      <select
                        name="area"
                        className={inputClass}
                        defaultValue=""
                        required
                      >
                        <option value="">Seleccionar area</option>
                        {referralAreas.map((item) => (
                          <option key={item.value} value={item.label}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <div className="flex flex-wrap items-center gap-2">
                      <SubmitButton pendingLabel="Derivando...">
                        Guardar
                      </SubmitButton>
                      <Button
                        type="button"
                        variant="secondary"
                        data-modal-close
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </AppModal>
              </>
            ) : null}
            <AppModal
              title="Historial completo de auditoria"
              trigger={
                <>
                  <FileText className="h-4 w-4" />
                  Auditoria
                </>
              }
              triggerVariant="secondary"
              size="lg"
            >
              <AuditTimeline logs={auditLogs} />
            </AppModal>
            <LinkButton
              href={`/despacho/${record.id}/legajo.pdf`}
              variant="secondary"
              target="_blank"
              rel="noreferrer"
            >
              <Download className="h-4 w-4" />
              Descargar legajo PDF
            </LinkButton>
            <LinkButton href="/despacho" variant="secondary">
              Volver
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DetailSection title="Datos principales">
          <FieldGrid>
            <DetailField
              label="Estado"
              value={<StatusBadge value={record.status} />}
            />
            <DetailField
              label="Prioridad"
              value={<StatusBadge value={record.priority} />}
            />
            <DetailField label="Categoria" value={categoryLabel} />
            <DetailField
              label="Fecha de atencion"
              value={formatDateTime(record.attendedAt)}
            />
            <DetailField
              label="Plazo"
              value={
                record.deadlineAt
                  ? formatDateTime(record.deadlineAt)
                  : "Sin plazo"
              }
            />
            <DetailField
              label="Carga en sistema"
              value={formatDateTime(record.createdAt)}
            />
            <DetailField
              label="Usuario que atendio"
              value={record.createdBy.name}
            />
            <DetailField label="Origen" value={labelFromValue(record.origin)} />
            <DetailField label="Area derivada" value={record.referredArea} />
            <DetailField
              label="Ultimo estado"
              value={formatDateTime(record.lastStatusAt)}
            />
          </FieldGrid>
        </DetailSection>

        <DetailSection title="Personas vinculadas">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl bg-[#f6fafc] p-3 ring-1 ring-[#d7e4ee]">
              <h3 className="text-sm font-semibold text-[#212529]">
                Personas denunciantes
              </h3>
              <div className="mt-3 space-y-3">
                {complainants.length ? (
                  complainants.map((complainant, index) => (
                    <div
                      key={`complainant-${index}`}
                      className="rounded-lg bg-white px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ring-[#e4edf4]"
                    >
                      {complainant.isAnonymous ? (
                        <p className="font-semibold text-[#212529]">
                          Denunciante anonimo
                        </p>
                      ) : (
                        <>
                          <p className="font-semibold text-[#212529]">
                            {display(
                              personDisplayName(
                                complainant.lastName,
                                complainant.firstName,
                              ),
                            )}
                          </p>
                          <p className="text-[#607589]">
                            DNI: {display(complainant.dni)}
                          </p>
                          <p className="text-[#607589]">
                            Telefono:{" "}
                            {display(
                              [complainant.phone1, complainant.phone2]
                                .filter(Boolean)
                                .join(" / "),
                            )}
                          </p>
                          <p className="text-[#607589]">
                            Domicilio: {display(complainant.address)}
                          </p>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#607589]">
                    Sin denunciantes cargados.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-[#f6fafc] p-3 ring-1 ring-[#d7e4ee]">
              <h3 className="text-sm font-semibold text-[#212529]">
                Personas denunciadas / vinculadas
              </h3>
              <div className="mt-3 space-y-3">
                {linkedPersons.length ? (
                  linkedPersons.map((person, index) => (
                    <div
                      key={`linked-person-${index}`}
                      className="rounded-lg bg-white px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ring-[#e4edf4]"
                    >
                      <p className="font-semibold text-[#212529]">
                        {display(
                          personDisplayName(
                            person.apellidoApodoManual,
                            person.firstName,
                          ),
                        )}
                      </p>
                      <p className="text-[#607589]">
                        DNI: {display(person.dni)}
                      </p>
                      <p className="text-[#607589]">
                        Telefono:{" "}
                        {display(
                          [person.phone1, person.phone2]
                            .filter(Boolean)
                            .join(" / "),
                        )}
                      </p>
                      <p className="text-[#607589]">
                        Domicilio: {display(person.address)}
                      </p>
                      {index === 0 && record.personId ? (
                        <Link
                          className="mt-1 inline-block font-semibold text-[#0667b0] hover:underline"
                          href={`/personas/${record.personId}`}
                        >
                          Ver persona
                        </Link>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#607589]">
                    Sin personas denunciadas o vinculadas cargadas.
                  </p>
                )}
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
            title="Expediente virtual · Atencion / reclamo"
            itemLabel="Seguimiento"
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
          allowHorizontalScroll={false}
          headers={[
            "Registro",
            "Fecha / usuario",
            "Actuacion",
            "Estado / seguimiento",
            "Archivos",
            "Observaciones",
          ]}
          minWidth={980}
        >
          {displayFollowUpRows.map(({ followUp, sheetNumber }) => {
            const parsed = parseJuridicalActionContent(followUp.content);
            const rowAttachments =
              attachmentsByFollowUpId.get(followUp.id) ?? [];
            const rowObservations =
              observationsByFollowUpId.get(followUp.id) ?? [];
            const canAddObservation =
              canMutateOriginLegajo && !isDerivationFollowUp(followUp);
            return (
              <LegajoInterventionRow
                key={followUp.id}
                modalTitle={`Seguimiento N° ${sheetNumber}`}
                modalContent={
                  <DispatchReadContent
                    date={followUp.createdAt}
                    deadlineAt={followUp.deadlineAt}
                    actor={followUp.createdBy.name}
                    statusAfter={followUp.statusAfter}
                    description={parsed.description}
                    guidance={parsed.guidanceProvided}
                    attachments={rowAttachments}
                    observations={rowObservations}
                  />
                }
              >
                <Td className="w-[150px]">
                  <span className="block font-semibold text-[#0667b0]">
                    Seguimiento N° {sheetNumber}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#212529]">
                    Registro agregado
                  </span>
                </Td>
                <Td className="w-[210px]">
                  <span className="block font-semibold">
                    {formatDateTime(followUp.createdAt)}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#212529]">
                    {followUp.createdBy.name}
                  </span>
                </Td>
                <Td>
                  <span className="block font-semibold">
                    Seguimiento de atencion
                  </span>
                  <span className="mt-1 block text-xs font-medium text-[#0667b0]">
                    Clic para ver el detalle
                  </span>
                </Td>
                <Td className="w-[230px]">
                  <div className="flex flex-wrap gap-1.5">
                    {followUp.statusAfter ? (
                      <StatusBadge value={followUp.statusAfter} />
                    ) : (
                      <span className="text-sm text-[#212529]">
                        Sin cambio de estado
                      </span>
                    )}
                    {followUp.deadlineAt ? (
                      <span className="rounded-sm border border-[#ffeeba] bg-[#fff3cd] px-2 py-0.5 text-xs font-semibold text-[#856404]">
                        Plazo: {formatDateTime(followUp.deadlineAt)}
                      </span>
                    ) : null}
                  </div>
                </Td>
                <Td className="w-[130px]">
                  <LegajoAttachmentCount count={rowAttachments.length} />
                </Td>
                <Td className="w-[160px] px-1.5">
                  <LegajoObservationCell
                    observations={rowObservations}
                    action={
                      canAddObservation
                        ? addDispatchObservation.bind(null, record.id)
                        : undefined
                    }
                    entityType="DispatchFollowUp"
                    entityId={followUp.id}
                    uploadModule="DESPACHO"
                    scopeId={record.id}
                  />
                </Td>
              </LegajoInterventionRow>
            );
          })}

          <LegajoInterventionRow
            modalTitle="Atencion N° 1"
            modalContent={
              <DispatchReadContent
                date={record.attendedAt}
                deadlineAt={record.deadlineAt}
                actor={record.createdBy.name}
                statusAfter={record.status}
                description={record.description}
                guidance={record.initialGuidance}
                confidentialNotes={record.confidentialNotes}
                attachments={generalAttachments}
                observations={recordObservations}
              />
            }
          >
            <Td className="w-[150px]">
              <span className="block font-semibold text-[#0667b0]">
                Atencion N° 1
              </span>
              <span className="mt-0.5 block text-xs text-[#212529]">
                Primera atencion
              </span>
            </Td>
            <Td className="w-[210px]">
              <span className="block font-semibold">
                {formatDateTime(record.attendedAt)}
              </span>
              <span className="mt-0.5 block text-xs text-[#212529]">
                {record.createdBy.name}
              </span>
            </Td>
            <Td>
              <span className="block font-semibold">{categoryLabel}</span>
              <span className="mt-1 block text-xs font-medium text-[#0667b0]">
                Clic para ver el detalle
              </span>
            </Td>
            <Td className="w-[230px]">
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge value={record.status} />
                {record.deadlineAt ? (
                  <span className="rounded-sm border border-[#ffeeba] bg-[#fff3cd] px-2 py-0.5 text-xs font-semibold text-[#856404]">
                    Plazo: {formatDateTime(record.deadlineAt)}
                  </span>
                ) : null}
              </div>
            </Td>
            <Td className="w-[130px]">
              <LegajoAttachmentCount count={generalAttachments.length} />
            </Td>
            <Td className="w-[160px] px-1.5">
              <LegajoObservationCell
                observations={recordObservations}
                action={
                  canMutateOriginLegajo
                    ? addDispatchObservation.bind(null, record.id)
                    : undefined
                }
                entityType="DispatchRecord"
                entityId={record.id}
                uploadModule="DESPACHO"
                scopeId={record.id}
              />
            </Td>
          </LegajoInterventionRow>
        </Table>
      </DetailSection>
    </>
  );
}
