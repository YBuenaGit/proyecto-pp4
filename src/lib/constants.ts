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
  "OTROS",
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
  "NUEVA_PRESENTACION",
  "ORIENTACION_ADICIONAL",
  "CIERRE",
  "SALUD_MENTAL",
  "INTERVENCION_ADMINISTRATIVA",
  "NOTIFICACIONES",
  "MEDIACION_VECINAL",
  "AUDIENCIA",
  "OTRO",
];

export const JURIDICAL_DERIVED_AREAS = [
  "Obras Publicas",
  "Servicios Urbanos",
  "Transito",
  "Defensa Civil",
  "Desarrollo Social",
  "gum",
  "area directivos",
  "Saneamiento",
  "Regulacion dominial",
  "Politica social",
  "Catastro",
  "Medio ambiente",
  "Urgencias vecinales",
  "Ojos en alerta",
  "Ministerio Publico Fiscal",
  "MPF",
  "Articulacion y derivacion",
  "Juzgado de familia",
  "Juzgado Civil / Cial",
  "Otros",
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
  ORIENTACION: "Orientacion",
  PRIMERA_INTERVENCION: "Primera intervencion",
  INFORME_SITUACION: "Informe de situacion",
  MPF: "Actuacion vinculada a MPF",
  ASUNTOS_JURIDICOS: "Direccion de Asuntos Juridicos",
  VIOLENCIA_GENERO: "Violencia de genero",
  VIOLENCIA_FAMILIAR: "Violencia familiar",
  RUIDOS_MOLESTOS: "Ruidos molestos",
  MEDIANERAS: "Medianeras",
  HABILITACIONES: "Habilitaciones",
  OFICIO_URGENTE: "Oficio urgente",
  SALUD_MENTAL: "Salud mental",
  INTERVENCION_ADMINISTRATIVA: "Intervencion administrativa",
  NOTIFICACIONES: "Notificaciones",
  MEDIACION_VECINAL: "Mediacion vecinal",
  AUDIENCIA: "Audiencia",
};

export const JURIDICAL_CONTEXT_LABELS: Record<string, string> = {
  ASUNTOS_JURIDICOS: "Direccion de Asuntos Juridicos",
  GUM: "GUM",
  INFORMACION_SITUACIONES: "Informacion de situaciones",
  MESA_DENUNCIAS: "Mesa de denuncias",
  MPF: "MPF",
  OJOS_ALERTA: "Ojos en alerta",
  ORIENTACION: "Orientacion",
  CONTENCION: "Contencion",
  JUZGADO_CIVIL_CIAL: "Juzgado Civil / Cial",
  JUZGADO_FAMILIA: "Juzgado de familia",
  JUZGADO_PAZ: "Juzgado de paz",
  POLITICA_SOCIAL: "Politica social",
  OTRO: "Otro",
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
