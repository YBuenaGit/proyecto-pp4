"use client";

import { useEffect, useTransition } from "react";
import { markReferralsViewed } from "@/app/(app)/referral-view-actions";
import type { ReferralLegajoModule } from "@/lib/referral-view-rules";

export function ReferralViewTracker({
  referralIds,
  legajoModule,
  legajoId,
}: {
  referralIds: string[];
  legajoModule: ReferralLegajoModule;
  legajoId: string;
}) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!referralIds.length) return;

    startTransition(() => {
      void markReferralsViewed(referralIds, { module: legajoModule, id: legajoId });
    });
  }, [legajoId, legajoModule, referralIds]);

  return null;
}
