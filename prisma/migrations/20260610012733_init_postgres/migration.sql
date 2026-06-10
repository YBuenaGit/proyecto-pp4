-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPerson" (
    "id" TEXT NOT NULL,
    "dni" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullNameNormalized" TEXT NOT NULL,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchRecord" (
    "id" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usesHistoricalDate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "personId" TEXT,
    "dniSnapshot" TEXT,
    "nameSnapshot" TEXT,
    "description" TEXT NOT NULL,
    "initialGuidance" TEXT,
    "confidentialNotes" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "referredArea" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'DIRECT',
    "lastStatusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchComplainant" (
    "id" TEXT NOT NULL,
    "dispatchRecordId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "dni" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchComplainant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchLinkedPerson" (
    "id" TEXT NOT NULL,
    "dispatchRecordId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dni" TEXT,
    "firstName" TEXT,
    "apellidoApodoManual" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchLinkedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchFollowUp" (
    "id" TEXT NOT NULL,
    "dispatchRecordId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "statusAfter" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuridicalIntervention" (
    "id" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "personId" TEXT,
    "dniSnapshot" TEXT,
    "nameSnapshot" TEXT,
    "complainantIsAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "complainantDni" TEXT,
    "complainantFirstName" TEXT,
    "complainantLastName" TEXT,
    "complainantPhone1" TEXT,
    "complainantPhone2" TEXT,
    "complainantAddress" TEXT,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "oficioNumber" TEXT,
    "expedienteNumber" TEXT,
    "interventionContext" TEXT,
    "counterpartType" TEXT,
    "description" TEXT NOT NULL,
    "guidanceProvided" TEXT,
    "referredToAgency" TEXT,
    "derivedArea" TEXT,
    "confidentialNotes" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'DIRECT',
    "lastStatusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuridicalIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuridicalComplainant" (
    "id" TEXT NOT NULL,
    "juridicalInterventionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "dni" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuridicalComplainant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuridicalLinkedPerson" (
    "id" TEXT NOT NULL,
    "juridicalInterventionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dni" TEXT,
    "firstName" TEXT,
    "apellidoApodoManual" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuridicalLinkedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuridicalAction" (
    "id" TEXT NOT NULL,
    "juridicalInterventionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "nextStepDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuridicalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "originModule" TEXT NOT NULL,
    "destinationModule" TEXT NOT NULL,
    "originDispatchRecordId" TEXT,
    "originJuridicalInterventionId" TEXT,
    "destinationDispatchRecordId" TEXT,
    "destinationJuridicalInterventionId" TEXT,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "visibleStatusForOrigin" TEXT NOT NULL DEFAULT 'Pendiente de recepción',
    "referredById" TEXT NOT NULL,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalExpedient" (
    "id" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "expedienteNumber" TEXT,
    "codigo" TEXT,
    "category" TEXT NOT NULL,
    "area" TEXT,
    "description" TEXT NOT NULL,
    "observation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INICIADO',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalExpedient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "calendarScope" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "assignedLawyerId" TEXT,
    "assignedArea" TEXT,
    "clientName" TEXT,
    "lawyerName" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "location" TEXT,
    "notes" TEXT,
    "caseId" TEXT,
    "caseTitle" TEXT,
    "expedienteNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retention" (
    "id" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actNumber" TEXT NOT NULL,
    "actType" TEXT NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "domain" TEXT,
    "engineNumber" TEXT,
    "chassisNumber" TEXT,
    "vehicleType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionHistory" (
    "id" TEXT NOT NULL,
    "retentionId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "editedById" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionAttachment" (
    "id" TEXT NOT NULL,
    "retentionId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "module" TEXT,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPerson_dni_key" ON "ExternalPerson"("dni");

-- CreateIndex
CREATE INDEX "ExternalPerson_fullNameNormalized_idx" ON "ExternalPerson"("fullNameNormalized");

-- CreateIndex
CREATE INDEX "ExternalPerson_lastName_idx" ON "ExternalPerson"("lastName");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRecord_internalNumber_key" ON "DispatchRecord"("internalNumber");

-- CreateIndex
CREATE INDEX "DispatchRecord_createdAt_idx" ON "DispatchRecord"("createdAt");

-- CreateIndex
CREATE INDEX "DispatchRecord_attendedAt_idx" ON "DispatchRecord"("attendedAt");

-- CreateIndex
CREATE INDEX "DispatchRecord_category_idx" ON "DispatchRecord"("category");

-- CreateIndex
CREATE INDEX "DispatchRecord_status_idx" ON "DispatchRecord"("status");

-- CreateIndex
CREATE INDEX "DispatchRecord_priority_idx" ON "DispatchRecord"("priority");

-- CreateIndex
CREATE INDEX "DispatchRecord_createdById_idx" ON "DispatchRecord"("createdById");

-- CreateIndex
CREATE INDEX "DispatchRecord_personId_idx" ON "DispatchRecord"("personId");

-- CreateIndex
CREATE INDEX "DispatchComplainant_dispatchRecordId_idx" ON "DispatchComplainant"("dispatchRecordId");

-- CreateIndex
CREATE INDEX "DispatchComplainant_dni_idx" ON "DispatchComplainant"("dni");

-- CreateIndex
CREATE INDEX "DispatchComplainant_firstName_idx" ON "DispatchComplainant"("firstName");

-- CreateIndex
CREATE INDEX "DispatchComplainant_lastName_idx" ON "DispatchComplainant"("lastName");

-- CreateIndex
CREATE INDEX "DispatchLinkedPerson_dispatchRecordId_idx" ON "DispatchLinkedPerson"("dispatchRecordId");

-- CreateIndex
CREATE INDEX "DispatchLinkedPerson_dni_idx" ON "DispatchLinkedPerson"("dni");

-- CreateIndex
CREATE INDEX "DispatchLinkedPerson_firstName_idx" ON "DispatchLinkedPerson"("firstName");

-- CreateIndex
CREATE INDEX "DispatchLinkedPerson_apellidoApodoManual_idx" ON "DispatchLinkedPerson"("apellidoApodoManual");

-- CreateIndex
CREATE INDEX "DispatchFollowUp_dispatchRecordId_idx" ON "DispatchFollowUp"("dispatchRecordId");

-- CreateIndex
CREATE INDEX "DispatchFollowUp_createdById_idx" ON "DispatchFollowUp"("createdById");

-- CreateIndex
CREATE INDEX "DispatchFollowUp_createdAt_idx" ON "DispatchFollowUp"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JuridicalIntervention_internalNumber_key" ON "JuridicalIntervention"("internalNumber");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_createdAt_idx" ON "JuridicalIntervention"("createdAt");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_attendedAt_idx" ON "JuridicalIntervention"("attendedAt");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_type_idx" ON "JuridicalIntervention"("type");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_status_idx" ON "JuridicalIntervention"("status");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_urgency_idx" ON "JuridicalIntervention"("urgency");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_oficioNumber_idx" ON "JuridicalIntervention"("oficioNumber");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_expedienteNumber_idx" ON "JuridicalIntervention"("expedienteNumber");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_createdById_idx" ON "JuridicalIntervention"("createdById");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_personId_idx" ON "JuridicalIntervention"("personId");

-- CreateIndex
CREATE INDEX "JuridicalIntervention_complainantDni_idx" ON "JuridicalIntervention"("complainantDni");

-- CreateIndex
CREATE INDEX "JuridicalComplainant_juridicalInterventionId_idx" ON "JuridicalComplainant"("juridicalInterventionId");

-- CreateIndex
CREATE INDEX "JuridicalComplainant_dni_idx" ON "JuridicalComplainant"("dni");

-- CreateIndex
CREATE INDEX "JuridicalComplainant_firstName_idx" ON "JuridicalComplainant"("firstName");

-- CreateIndex
CREATE INDEX "JuridicalComplainant_lastName_idx" ON "JuridicalComplainant"("lastName");

-- CreateIndex
CREATE INDEX "JuridicalLinkedPerson_juridicalInterventionId_idx" ON "JuridicalLinkedPerson"("juridicalInterventionId");

-- CreateIndex
CREATE INDEX "JuridicalLinkedPerson_dni_idx" ON "JuridicalLinkedPerson"("dni");

-- CreateIndex
CREATE INDEX "JuridicalLinkedPerson_firstName_idx" ON "JuridicalLinkedPerson"("firstName");

-- CreateIndex
CREATE INDEX "JuridicalLinkedPerson_apellidoApodoManual_idx" ON "JuridicalLinkedPerson"("apellidoApodoManual");

-- CreateIndex
CREATE INDEX "JuridicalAction_juridicalInterventionId_idx" ON "JuridicalAction"("juridicalInterventionId");

-- CreateIndex
CREATE INDEX "JuridicalAction_actionType_idx" ON "JuridicalAction"("actionType");

-- CreateIndex
CREATE INDEX "JuridicalAction_nextStepDate_idx" ON "JuridicalAction"("nextStepDate");

-- CreateIndex
CREATE INDEX "JuridicalAction_createdById_idx" ON "JuridicalAction"("createdById");

-- CreateIndex
CREATE INDEX "JuridicalAction_createdAt_idx" ON "JuridicalAction"("createdAt");

-- CreateIndex
CREATE INDEX "Referral_originModule_idx" ON "Referral"("originModule");

-- CreateIndex
CREATE INDEX "Referral_destinationModule_idx" ON "Referral"("destinationModule");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_referredAt_idx" ON "Referral"("referredAt");

-- CreateIndex
CREATE INDEX "Referral_originDispatchRecordId_idx" ON "Referral"("originDispatchRecordId");

-- CreateIndex
CREATE INDEX "Referral_originJuridicalInterventionId_idx" ON "Referral"("originJuridicalInterventionId");

-- CreateIndex
CREATE INDEX "Referral_destinationDispatchRecordId_idx" ON "Referral"("destinationDispatchRecordId");

-- CreateIndex
CREATE INDEX "Referral_destinationJuridicalInterventionId_idx" ON "Referral"("destinationJuridicalInterventionId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalExpedient_internalNumber_key" ON "InternalExpedient"("internalNumber");

-- CreateIndex
CREATE INDEX "InternalExpedient_codigo_idx" ON "InternalExpedient"("codigo");

-- CreateIndex
CREATE INDEX "InternalExpedient_category_idx" ON "InternalExpedient"("category");

-- CreateIndex
CREATE INDEX "InternalExpedient_area_idx" ON "InternalExpedient"("area");

-- CreateIndex
CREATE INDEX "InternalExpedient_status_idx" ON "InternalExpedient"("status");

-- CreateIndex
CREATE INDEX "InternalExpedient_createdById_idx" ON "InternalExpedient"("createdById");

-- CreateIndex
CREATE INDEX "InternalExpedient_createdAt_idx" ON "InternalExpedient"("createdAt");

-- CreateIndex
CREATE INDEX "InternalExpedient_expedienteNumber_idx" ON "InternalExpedient"("expedienteNumber");

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "Appointment"("date");

-- CreateIndex
CREATE INDEX "Appointment_calendarScope_date_idx" ON "Appointment"("calendarScope", "date");

-- CreateIndex
CREATE INDEX "Appointment_ownerUserId_date_idx" ON "Appointment"("ownerUserId", "date");

-- CreateIndex
CREATE INDEX "Appointment_createdByUserId_idx" ON "Appointment"("createdByUserId");

-- CreateIndex
CREATE INDEX "Appointment_assignedUserId_idx" ON "Appointment"("assignedUserId");

-- CreateIndex
CREATE INDEX "Appointment_assignedLawyerId_idx" ON "Appointment"("assignedLawyerId");

-- CreateIndex
CREATE INDEX "Appointment_assignedArea_idx" ON "Appointment"("assignedArea");

-- CreateIndex
CREATE INDEX "Appointment_type_idx" ON "Appointment"("type");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_expedienteNumber_idx" ON "Appointment"("expedienteNumber");

-- CreateIndex
CREATE INDEX "Attachment_module_idx" ON "Attachment"("module");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE INDEX "Attachment_createdAt_idx" ON "Attachment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Retention_internalNumber_key" ON "Retention"("internalNumber");

-- CreateIndex
CREATE INDEX "Retention_dateTime_idx" ON "Retention"("dateTime");

-- CreateIndex
CREATE INDEX "Retention_actNumber_idx" ON "Retention"("actNumber");

-- CreateIndex
CREATE INDEX "Retention_recordNumber_idx" ON "Retention"("recordNumber");

-- CreateIndex
CREATE INDEX "Retention_domain_idx" ON "Retention"("domain");

-- CreateIndex
CREATE INDEX "Retention_engineNumber_idx" ON "Retention"("engineNumber");

-- CreateIndex
CREATE INDEX "Retention_chassisNumber_idx" ON "Retention"("chassisNumber");

-- CreateIndex
CREATE INDEX "Retention_status_idx" ON "Retention"("status");

-- CreateIndex
CREATE INDEX "Retention_createdById_idx" ON "Retention"("createdById");

-- CreateIndex
CREATE INDEX "RetentionHistory_retentionId_idx" ON "RetentionHistory"("retentionId");

-- CreateIndex
CREATE INDEX "RetentionHistory_editedById_idx" ON "RetentionHistory"("editedById");

-- CreateIndex
CREATE INDEX "RetentionHistory_editedAt_idx" ON "RetentionHistory"("editedAt");

-- CreateIndex
CREATE INDEX "RetentionAttachment_retentionId_idx" ON "RetentionAttachment"("retentionId");

-- CreateIndex
CREATE INDEX "RetentionAttachment_uploadedById_idx" ON "RetentionAttachment"("uploadedById");

-- CreateIndex
CREATE INDEX "RetentionAttachment_createdAt_idx" ON "RetentionAttachment"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdById_idx" ON "AuditLog"("createdById");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CatalogItem_type_idx" ON "CatalogItem"("type");

-- CreateIndex
CREATE INDEX "CatalogItem_module_idx" ON "CatalogItem"("module");

-- CreateIndex
CREATE INDEX "CatalogItem_value_idx" ON "CatalogItem"("value");

-- CreateIndex
CREATE INDEX "CatalogItem_active_idx" ON "CatalogItem"("active");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchRecord" ADD CONSTRAINT "DispatchRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchRecord" ADD CONSTRAINT "DispatchRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "ExternalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchComplainant" ADD CONSTRAINT "DispatchComplainant_dispatchRecordId_fkey" FOREIGN KEY ("dispatchRecordId") REFERENCES "DispatchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLinkedPerson" ADD CONSTRAINT "DispatchLinkedPerson_dispatchRecordId_fkey" FOREIGN KEY ("dispatchRecordId") REFERENCES "DispatchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchFollowUp" ADD CONSTRAINT "DispatchFollowUp_dispatchRecordId_fkey" FOREIGN KEY ("dispatchRecordId") REFERENCES "DispatchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchFollowUp" ADD CONSTRAINT "DispatchFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuridicalIntervention" ADD CONSTRAINT "JuridicalIntervention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuridicalIntervention" ADD CONSTRAINT "JuridicalIntervention_personId_fkey" FOREIGN KEY ("personId") REFERENCES "ExternalPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuridicalComplainant" ADD CONSTRAINT "JuridicalComplainant_juridicalInterventionId_fkey" FOREIGN KEY ("juridicalInterventionId") REFERENCES "JuridicalIntervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuridicalLinkedPerson" ADD CONSTRAINT "JuridicalLinkedPerson_juridicalInterventionId_fkey" FOREIGN KEY ("juridicalInterventionId") REFERENCES "JuridicalIntervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuridicalAction" ADD CONSTRAINT "JuridicalAction_juridicalInterventionId_fkey" FOREIGN KEY ("juridicalInterventionId") REFERENCES "JuridicalIntervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuridicalAction" ADD CONSTRAINT "JuridicalAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_originDispatchRecordId_fkey" FOREIGN KEY ("originDispatchRecordId") REFERENCES "DispatchRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_originJuridicalInterventionId_fkey" FOREIGN KEY ("originJuridicalInterventionId") REFERENCES "JuridicalIntervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_destinationDispatchRecordId_fkey" FOREIGN KEY ("destinationDispatchRecordId") REFERENCES "DispatchRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_destinationJuridicalInterventionId_fkey" FOREIGN KEY ("destinationJuridicalInterventionId") REFERENCES "JuridicalIntervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalExpedient" ADD CONSTRAINT "InternalExpedient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_assignedLawyerId_fkey" FOREIGN KEY ("assignedLawyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retention" ADD CONSTRAINT "Retention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionHistory" ADD CONSTRAINT "RetentionHistory_retentionId_fkey" FOREIGN KEY ("retentionId") REFERENCES "Retention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionHistory" ADD CONSTRAINT "RetentionHistory_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionAttachment" ADD CONSTRAINT "RetentionAttachment_retentionId_fkey" FOREIGN KEY ("retentionId") REFERENCES "Retention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionAttachment" ADD CONSTRAINT "RetentionAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
