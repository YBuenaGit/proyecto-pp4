export type ProfileAvatarActionState = {
  status: "idle" | "success" | "error";
  message: string;
  nonce: number;
};

export const initialProfileAvatarActionState: ProfileAvatarActionState = {
  status: "idle",
  message: "",
  nonce: 0,
};
