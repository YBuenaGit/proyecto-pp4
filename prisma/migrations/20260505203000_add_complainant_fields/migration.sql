-- Add separate complainant data to keep the reported person and the person
-- who initiates the claim independent.
ALTER TABLE "DispatchRecord" ADD COLUMN "complainantIsAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DispatchRecord" ADD COLUMN "complainantDni" TEXT;
ALTER TABLE "DispatchRecord" ADD COLUMN "complainantFirstName" TEXT;
ALTER TABLE "DispatchRecord" ADD COLUMN "complainantLastName" TEXT;
ALTER TABLE "DispatchRecord" ADD COLUMN "complainantPhone1" TEXT;
ALTER TABLE "DispatchRecord" ADD COLUMN "complainantPhone2" TEXT;
ALTER TABLE "DispatchRecord" ADD COLUMN "complainantAddress" TEXT;

ALTER TABLE "JuridicalIntervention" ADD COLUMN "complainantIsAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JuridicalIntervention" ADD COLUMN "complainantDni" TEXT;
ALTER TABLE "JuridicalIntervention" ADD COLUMN "complainantFirstName" TEXT;
ALTER TABLE "JuridicalIntervention" ADD COLUMN "complainantLastName" TEXT;
ALTER TABLE "JuridicalIntervention" ADD COLUMN "complainantPhone1" TEXT;
ALTER TABLE "JuridicalIntervention" ADD COLUMN "complainantPhone2" TEXT;
ALTER TABLE "JuridicalIntervention" ADD COLUMN "complainantAddress" TEXT;

CREATE INDEX "DispatchRecord_complainantDni_idx" ON "DispatchRecord"("complainantDni");
CREATE INDEX "JuridicalIntervention_complainantDni_idx" ON "JuridicalIntervention"("complainantDni");
