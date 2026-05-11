export const ROLES = {
  despacho: "despacho",
  juridico: "juridico",
  directivo: "directivo",
  admin: "admin",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  despacho: "Despacho",
  juridico: "Intervenciones",
  directivo: "Directivo",
  admin: "Administracion",
};

export const DISPATCH_STATUSES = [
  "RECIBIDO",
  "EN_ANALISIS",
  "DERIVADO",
  "EN_GESTION",
  "RESUELTO",
  "CERRADO",
  "ARCHIVADO",
];

export const JURIDICAL_STATUSES = [
  "RECIBIDO",
  "EN_ORIENTACION",
  "PENDIENTE_DOCUMENTACION",
  "DERIVADO_EXTERNAMENTE",
  "EN_SEGUIMIENTO",
  "CONCLUIDO",
  "ARCHIVADO",
];

export const EXPEDIENT_STATUSES = [
  "INICIADO",
  "EN_TRAMITE",
  "OBSERVADO",
  "EN_APROBACION",
  "APROBADO",
  "FINALIZADO",
  "ARCHIVADO",
];

export const PRIORITIES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

export const REFERRAL_STATUSES = ["PENDIENTE", "RECIBIDA", "EN_GESTION", "CERRADA"];

export const COUNTERPART_TYPES = [
  ["DENUNCIANTE", "Denunciante"],
  ["DENUNCIADO", "Denunciado"],
  ["AMBAS_PARTES", "Ambas partes"],
  ["TERCERO", "Tercero"],
  ["NO_APLICA", "No aplica"],
] as const;

export const ACTION_TYPES = [
  "ORIENTACION",
  "PRIMERA_INTERVENCION",
  "CONTENCION",
  "INFORME",
  "OFICIO",
  "DERIVACION",
  "SEGUIMIENTO",
  "CIERRE",
];

export const DISPATCH_CATEGORY_LABELS: Record<string, string> = {
  RECLAMO: "Reclamo",
  CONSULTA: "Consulta",
  SUGERENCIA: "Sugerencia",
  PEDIDO: "Pedido",
  DERIVACION_AREA: "Derivacion a otra area",
  SITUACION_VECINAL: "Situacion vecinal",
  ATENCION_GENERAL: "Atencion general",
};

export const JURIDICAL_TYPE_LABELS: Record<string, string> = {
  DENUNCIA_VECINAL: "Denuncia vecinal",
  CONFLICTO_VECINAL: "Conflicto vecinal",
  ORIENTACION: "Orientacion",
  ABOGADOS_GRATUITOS: "Abogados gratuitos",
  PRIMERA_INTERVENCION: "Primera intervencion",
  CONTENCION: "Contencion",
  INFORME_SITUACION: "Informe de situacion",
  MPF: "Actuacion vinculada a MPF",
  ASUNTOS_JURIDICOS: "Direccion de Asuntos Juridicos",
  VIOLENCIA_GENERO: "Violencia de genero",
  VIOLENCIA_FAMILIAR: "Violencia familiar",
  RUIDOS_MOLESTOS: "Ruidos molestos",
  MEDIANERAS: "Medianeras",
  HABILITACIONES: "Habilitaciones",
  OFICIO_URGENTE: "Oficio urgente",
};

export const JURIDICAL_CONTEXT_LABELS: Record<string, string> = {
  ASUNTOS_JURIDICOS: "Direccion de Asuntos Juridicos",
  GUM: "GUM",
  INFORMACION_SITUACIONES: "Informacion de situaciones",
  MESA_DENUNCIAS: "Mesa de denuncias",
  MPF: "Ministerio Publico Fiscal",
  OJOS_ALERTA: "Ojos en alerta",
  ORIENTACION: "Orientacion",
  INFORME: "Informe de situacion",
  CONTENCION: "Contencion",
};

export const EXPEDIENT_CATEGORY_LABELS: Record<string, string> = {
  COMPRAS: "Compras",
  REPUESTOS: "Repuestos",
  SUELDOS: "Sueldos",
  ALIMENTOS: "Alimentos",
  INSUMOS: "Insumos",
  MANTENIMIENTO: "Mantenimiento",
  OTROS: "Otros",
};
