"use server";

import { refresh, revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  referralDestinationModuleForRole,
  type ReferralLegajoModule,
} from "@/lib/referral-view-rules";

const maxReferralIdsPerRequest = 50;

function uniqueReferralIds(referralIds: string[]) {
  return Array.from(
    new Set(
      referralIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, maxReferralIdsPerRequest);
}

function referralPaths(referral: {
  originDispatchRecordId: string | null;
  originJuridicalInterventionId: string | null;
  destinationDispatchRecordId: string | null;
  destinationJuridicalInterventionId: string | null;
}) {
  return [
    referral.originDispatchRecordId ? `/despacho/${referral.originDispatchRecordId}` : null,
    referral.originJuridicalInterventionId
      ? `/intervenciones/${referral.originJuridicalInterventionId}`
      : null,
    referral.destinationDispatchRecordId
      ? `/despacho/${referral.destinationDispatchRecordId}`
      : null,
    referral.destinationJuridicalInterventionId
      ? `/intervenciones/${referral.destinationJuridicalInterventionId}`
      : null,
  ].filter((path): path is string => Boolean(path));
}

export async function markReferralsViewed(
  referralIds: string[],
  legajo: { module: ReferralLegajoModule; id: string },
) {
  const user = await requireUser();
  const destinationModule = referralDestinationModuleForRole(user.role);
  const ids = uniqueReferralIds(referralIds);
  const legajoId = legajo.id.trim();

  if (!destinationModule || !ids.length || !legajoId) return;

  const linkedLegajoWhere =
    destinationModule === "DIRECTIVO"
      ? legajo.module === "DESPACHO"
        ? { originDispatchRecordId: legajoId }
        : { originJuridicalInterventionId: legajoId }
      : destinationModule === "DESPACHO"
        ? { destinationDispatchRecordId: legajoId }
        : { destinationJuridicalInterventionId: legajoId };

  const eligibleReferrals = await prisma.referral.findMany({
    where: {
      id: { in: ids },
      destinationModule,
      referredById: { not: user.id },
      ...linkedLegajoWhere,
    },
    select: {
      id: true,
      originDispatchRecordId: true,
      originJuridicalInterventionId: true,
      destinationDispatchRecordId: true,
      destinationJuridicalInterventionId: true,
    },
  });

  if (!eligibleReferrals.length) return;

  const eligibleIds = eligibleReferrals.map((referral) => referral.id);
  const viewedAt = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    const firstViews = await transaction.referral.updateMany({
      where: {
        id: { in: eligibleIds },
        destinationModule,
        referredById: { not: user.id },
        viewedAt: null,
        ...linkedLegajoWhere,
      },
      data: {
        viewedAt,
        viewedById: user.id,
      },
    });

    const notificationReads = await transaction.notificationRead.createMany({
      data: eligibleIds.map((referralId) => ({
        userId: user.id,
        notificationKey: `referral:${referralId}`,
      })),
      skipDuplicates: true,
    });

    return {
      firstViewCount: firstViews.count,
      notificationReadCount: notificationReads.count,
    };
  });

  const paths = new Set(eligibleReferrals.flatMap(referralPaths));
  paths.forEach((path) => revalidatePath(path));
  revalidatePath("/");

  if (result.firstViewCount || result.notificationReadCount) refresh();
}
