ALTER TABLE "DispatchRecord" ADD COLUMN "deadlineAt" TIMESTAMP(3);
ALTER TABLE "DispatchFollowUp" ADD COLUMN "deadlineAt" TIMESTAMP(3);
ALTER TABLE "JuridicalIntervention" ADD COLUMN "deadlineAt" TIMESTAMP(3);
ALTER TABLE "JuridicalAction" ADD COLUMN "deadlineAt" TIMESTAMP(3);
ALTER TABLE "InternalExpedient" ADD COLUMN "deadlineAt" TIMESTAMP(3);

CREATE INDEX "DispatchRecord_deadlineAt_idx" ON "DispatchRecord"("deadlineAt");
CREATE INDEX "DispatchFollowUp_deadlineAt_idx" ON "DispatchFollowUp"("deadlineAt");
CREATE INDEX "JuridicalIntervention_deadlineAt_idx" ON "JuridicalIntervention"("deadlineAt");
CREATE INDEX "JuridicalAction_deadlineAt_idx" ON "JuridicalAction"("deadlineAt");
CREATE INDEX "InternalExpedient_deadlineAt_idx" ON "InternalExpedient"("deadlineAt");
