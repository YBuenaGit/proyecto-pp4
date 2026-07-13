ALTER TABLE "Referral"
ADD COLUMN "viewedAt" TIMESTAMPTZ(3),
ADD COLUMN "viewedById" TEXT;

-- Preserve existing referral reads, but only when the reader belongs to the
-- exact destination role and is not the user who made the referral.
WITH "FirstValidRead" AS (
  SELECT DISTINCT ON (referral."id")
    referral."id" AS "referralId",
    notification_read."userId" AS "viewedById",
    notification_read."readAt" AS "viewedAt"
  FROM "Referral" AS referral
  INNER JOIN "NotificationRead" AS notification_read
    ON notification_read."notificationKey" = CONCAT('referral:', referral."id")
  INNER JOIN "User" AS reader
    ON reader."id" = notification_read."userId"
  WHERE notification_read."userId" <> referral."referredById"
    AND (
      (referral."destinationModule" = 'DESPACHO' AND reader."role" = 'despacho')
      OR (referral."destinationModule" = 'JURIDICO' AND reader."role" = 'juridico')
      OR (referral."destinationModule" = 'DIRECTIVO' AND reader."role" = 'directivo')
    )
  ORDER BY referral."id", notification_read."readAt" ASC
)
UPDATE "Referral" AS referral
SET
  "viewedAt" = first_read."viewedAt",
  "viewedById" = first_read."viewedById"
FROM "FirstValidRead" AS first_read
WHERE referral."id" = first_read."referralId";

CREATE INDEX "Referral_viewedAt_idx" ON "Referral"("viewedAt");
CREATE INDEX "Referral_viewedById_idx" ON "Referral"("viewedById");

ALTER TABLE "Referral"
ADD CONSTRAINT "Referral_viewedById_fkey"
FOREIGN KEY ("viewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
