export const MAX_DIRECT_UPLOAD_FILES = 4;
export const MAX_DIRECT_UPLOAD_FILE_BYTES = 1024 * 1024 * 1024;
export const DIRECT_UPLOAD_PART_BYTES = 16 * 1024 * 1024;
export const DIRECT_UPLOAD_CONCURRENCY = 3;
export const DIRECT_UPLOAD_RETRIES = 3;

export const DIRECT_UPLOAD_MODULES = ["ANUNCIOS", "DESPACHO", "JURIDICO", "RETENCIONES"] as const;

export type DirectUploadModule = (typeof DIRECT_UPLOAD_MODULES)[number];

export type DirectUploadIntent = {
  module: DirectUploadModule;
  entityType:
    | "DispatchRecord"
    | "DispatchFollowUp"
    | "InternalExpedient"
    | "JuridicalIntervention"
    | "JuridicalAction"
    | "LegajoObservation"
    | "Announcement"
    | "Retention";
  scopeId?: string;
};

export type DirectUploadSessionResponse = {
  id: string;
  partSize: number;
  partCount: number;
};

export function directUploadPartCount(size: number) {
  return Math.max(1, Math.ceil(size / DIRECT_UPLOAD_PART_BYTES));
}

export function formatDirectUploadLimit() {
  return "1 GB";
}
