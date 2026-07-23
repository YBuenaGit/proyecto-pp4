export type AnnouncementAttachmentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorAvatarAttachmentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  attachments: AnnouncementAttachmentItem[];
};

export type AnnouncementActionState = {
  status: "idle" | "success" | "error";
  message: string;
  nonce: number;
};

export const initialAnnouncementActionState: AnnouncementActionState = {
  status: "idle",
  message: "",
  nonce: 0,
};
