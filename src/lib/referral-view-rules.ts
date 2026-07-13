import { ROLES } from "./constants";

export const INTERNAL_REFERRAL_MODULES = ["DESPACHO", "JURIDICO", "DIRECTIVO"] as const;

export type InternalReferralModule = (typeof INTERNAL_REFERRAL_MODULES)[number];

export type ReferralLegajoModule = "DESPACHO" | "JURIDICO";

type ReferralViewCandidate = {
  id: string;
  destinationModule: string;
  referredById: string;
  viewedAt: Date | null;
  originDispatchRecordId: string | null;
  originJuridicalInterventionId: string | null;
  destinationDispatchRecordId: string | null;
  destinationJuridicalInterventionId: string | null;
};

export function referralDestinationModuleForRole(role: string): InternalReferralModule | null {
  if (role === ROLES.despacho) return "DESPACHO";
  if (role === ROLES.juridico) return "JURIDICO";
  if (role === ROLES.directivo) return "DIRECTIVO";
  return null;
}

export function isInternalReferralModule(value: string): value is InternalReferralModule {
  return INTERNAL_REFERRAL_MODULES.includes(value as InternalReferralModule);
}

export function canRecordReferralView({
  userId,
  userRole,
  destinationModule,
  referredById,
}: {
  userId: string;
  userRole: string;
  destinationModule: string;
  referredById: string;
}) {
  const expectedDestination = referralDestinationModuleForRole(userRole);
  return Boolean(
    expectedDestination &&
      expectedDestination === destinationModule &&
      userId !== referredById,
  );
}

function isReferralLinkedToLegajo(
  referral: ReferralViewCandidate,
  legajoModule: ReferralLegajoModule,
  legajoId: string,
) {
  if (referral.destinationModule === "DIRECTIVO") {
    return legajoModule === "DESPACHO"
      ? referral.originDispatchRecordId === legajoId
      : referral.originJuridicalInterventionId === legajoId;
  }

  return legajoModule === "DESPACHO"
    ? referral.destinationDispatchRecordId === legajoId
    : referral.destinationJuridicalInterventionId === legajoId;
}

export function referralIdsToMarkForLegajo({
  referrals,
  userId,
  userRole,
  legajoModule,
  legajoId,
}: {
  referrals: ReferralViewCandidate[];
  userId: string;
  userRole: string;
  legajoModule: ReferralLegajoModule;
  legajoId: string;
}) {
  return Array.from(
    new Set(
      referrals
        .filter((referral) => !referral.viewedAt)
        .filter((referral) =>
          canRecordReferralView({
            userId,
            userRole,
            destinationModule: referral.destinationModule,
            referredById: referral.referredById,
          }),
        )
        .filter((referral) => isReferralLinkedToLegajo(referral, legajoModule, legajoId))
        .map((referral) => referral.id),
    ),
  );
}
