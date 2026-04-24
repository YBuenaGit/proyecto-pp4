-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dni" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullNameNormalized" TEXT NOT NULL,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DispatchRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "attendedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "personId" TEXT,
    "manualPersonName" TEXT,
    "dniSnapshot" TEXT,
    "nameSnapshot" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "referredArea" TEXT,
    "notes" TEXT,
    "confidentialSummary" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'DIRECT',
    "lastStatusAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DispatchRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DispatchRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "ExternalPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchRecordId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "statusAfter" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DispatchFollowUp_dispatchRecordId_fkey" FOREIGN KEY ("dispatchRecordId") REFERENCES "DispatchRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispatchFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JuridicalIntervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "attendedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "personId" TEXT,
    "manualPersonName" TEXT,
    "dniSnapshot" TEXT,
    "nameSnapshot" TEXT,
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
    "origin" TEXT NOT NULL DEFAULT 'DIRECT',
    "lastStatusAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JuridicalIntervention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JuridicalIntervention_personId_fkey" FOREIGN KEY ("personId") REFERENCES "ExternalPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JuridicalAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "juridicalInterventionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "nextStepDate" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JuridicalAction_juridicalInterventionId_fkey" FOREIGN KEY ("juridicalInterventionId") REFERENCES "JuridicalIntervention" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JuridicalAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "referredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Referral_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Referral_originDispatchRecordId_fkey" FOREIGN KEY ("originDispatchRecordId") REFERENCES "DispatchRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Referral_originJuridicalInterventionId_fkey" FOREIGN KEY ("originJuridicalInterventionId") REFERENCES "JuridicalIntervention" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Referral_destinationDispatchRecordId_fkey" FOREIGN KEY ("destinationDispatchRecordId") REFERENCES "DispatchRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Referral_destinationJuridicalInterventionId_fkey" FOREIGN KEY ("destinationJuridicalInterventionId") REFERENCES "JuridicalIntervention" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InternalExpedient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalNumber" TEXT NOT NULL,
    "expedienteNumber" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INICIADO',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InternalExpedient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "module" TEXT,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE INDEX "InternalExpedient_category_idx" ON "InternalExpedient"("category");

-- CreateIndex
CREATE INDEX "InternalExpedient_status_idx" ON "InternalExpedient"("status");

-- CreateIndex
CREATE INDEX "InternalExpedient_createdById_idx" ON "InternalExpedient"("createdById");

-- CreateIndex
CREATE INDEX "InternalExpedient_createdAt_idx" ON "InternalExpedient"("createdAt");

-- CreateIndex
CREATE INDEX "InternalExpedient_expedienteNumber_idx" ON "InternalExpedient"("expedienteNumber");

-- CreateIndex
CREATE INDEX "Attachment_module_idx" ON "Attachment"("module");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE INDEX "Attachment_createdAt_idx" ON "Attachment"("createdAt");

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
