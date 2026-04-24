-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_assignedLawyerId_fkey" FOREIGN KEY ("assignedLawyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
