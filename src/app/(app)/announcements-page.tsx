import { AnnouncementsBoard } from "@/components/announcements/announcements-board";
import { requireUser } from "@/lib/auth";
import { listAnnouncements } from "@/lib/announcements";
import { isAdmin } from "@/lib/rbac";

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const canAdminister = isAdmin(user);
  const [announcements, deletedAnnouncements] = await Promise.all([
    listAnnouncements(false),
    canAdminister ? listAnnouncements(true) : Promise.resolve([]),
  ]);

  return (
    <AnnouncementsBoard
      currentUserName={user.name}
      currentUserAvatarAttachmentId={user.avatarAttachmentId}
      announcements={announcements}
      deletedAnnouncements={deletedAnnouncements}
      canAdminister={canAdminister}
    />
  );
}
