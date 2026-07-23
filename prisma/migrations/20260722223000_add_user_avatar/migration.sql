-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarAttachmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarAttachmentId_key" ON "User"("avatarAttachmentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarAttachmentId_fkey"
FOREIGN KEY ("avatarAttachmentId") REFERENCES "Attachment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
