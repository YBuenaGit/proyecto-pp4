export type CurrentUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  active: boolean;
  avatarAttachmentId?: string | null;
};

export type SearchParams = Record<string, string | string[] | undefined>;
