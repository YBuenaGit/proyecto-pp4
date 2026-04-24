export type CurrentUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  active: boolean;
};

export type SearchParams = Record<string, string | string[] | undefined>;
