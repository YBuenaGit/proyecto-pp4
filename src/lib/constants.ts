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
  "ARCHIVADO",
  "CERRADO",
  "DERIVADO",
  "EN_ANALISIS",
  "EN_GESTION",
  "RECIBIDO",
  "RESUELTO",
];

export const JURIDICAL_STATUSES = [
  "ARCHIVADO",
  "CONCLUIDO",
  "DERIVADO_EXTERNAMENTE",
  "EN_ORIENTACION",
  "EN_SEGUIMIENTO",
  "PENDIENTE_DOCUMENTACION",
  "RECIBIDO",
  "OTROS",
];

export const EXPEDIENT_STATUSES = [
  "APROBADO",
  "ARCHIVADO",
  "EN_APROBACION",
  "EN_TRAMITE",
  "FINALIZADO",
  "GUARDA_TEMPORAL",
  "INICIADO",
  "OBSERVADO",
  "TRAMITACION",
];

export const EXPEDIENT_AREAS = [
  { value: "ATENCION_Y_CONTENCION_A_LA_VICTIMA", label: "Atencion y Contencion a la Victima" },
  { value: "DEFENSA_CIVIL", label: "Defensa Civil" },
  { value: "DIRECCION_DE_SEGURIDAD", label: "Direccion de Seguridad" },
  { value: "GUM", label: "GUM" },
  { value: "PARTES_MEDICOS", label: "Partes Medicos" },
  { value: "SECRETARIA", label: "Secretaria" },
  { value: "SERENOS", label: "Serenos" },
];

export const PRIORITIES = ["ALTA", "BAJA", "MEDIA", "URGENTE"];

export const REFERRAL_STATUSES = ["PENDIENTE", "RECIBIDA", "EN_GESTION", "CERRADA"];

export const COUNTERPART_TYPES = [
  ["DENUNCIANTE", "Denunciante"],
  ["DENUNCIADO", "Denunciado"],
  ["AMBAS_PARTES", "Ambas partes"],
  ["TERCERO", "Tercero"],
  ["NO_APLICA", "No aplica"],
] as const;

export const ACTION_TYPES = [
  "AUDIENCIA",
  "CIERRE",
  "CONTENCION",
  "DERIVACION",
  "INFORME",
  "INTERVENCION_ADMINISTRATIVA",
  "MEDIACION_VECINAL",
  "NOTIFICACIONES",
  "NUEVA_PRESENTACION",
  "OFICIO",
  "ORIENTACION",
  "ORIENTACION_ADICIONAL",
  "PRIMERA_INTERVENCION",
  "SALUD_MENTAL",
  "SEGUIMIENTO",
  "OTRO",
];

export const JURIDICAL_DERIVED_AREAS = [
  "Articulacion y derivacion",
  "Catastro",
  "Defensa Civil",
  "Desarrollo Social",
  "Despacho",
  "Directivo",
  "GUM",
  "Juzgado Civil / Cial",
  "Juzgado de familia",
  "Medio ambiente",
  "Ministerio Publico Fiscal",
  "MPF",
  "Obras Publicas",
  "Ojos en alerta",
  "Politica social",
  "Regulacion dominial",
  "Saneamiento",
  "Servicios Urbanos",
  "Transito",
  "Urgencias vecinales",
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
  AYUDA_ECONOMICA: "Ayuda economica",
  HONORARIOS: "Honorarios",
  CONTRATOS_DE_PERSONAL: "Contratos de personal",
  SOLICITUD_DE_INFORMES: "Solicitud de informes",
  INFORMES_NOVEDADES_SERENOS: "Informes / novedades de serenos",
  SOLICITUD_DE_INDUMENTARIA: "Solicitud de indumentaria",
  SOLICITUD_DE_CAMARAS: "Solicitud de camaras",
  SOLICITUD_DE_ELEMENTOS_DE_TRANSITO: "Solicitud de elementos de transito",
  PEDIDO_DE_ALFALFA_PARA_EQUINOS: "Pedido de alfalfa para equinos",
  PAGO_DE_FACTURA: "Pago de factura",
  PEDIDO_DE_PAGO_DE_FACTURA: "Pedido de pago de factura",
  REINTEGROS: "Reintegros",
  ALQUILERES: "Alquileres",
  INSUMOS_DE_LIBRERIA: "Insumos de libreria",
  ELEMENTOS_DE_LIMPIEZA: "Elementos de limpieza",
  ELEMENTOS_PARA_REACONDICIONAMIENTO: "Elementos para reacondicionamiento",
  VETERINARIA: "Veterinaria",
  MECANICA_MANTENIMIENTO_VEHICULAR: "Mecanica / mantenimiento vehicular",
  SERVICE_DE_CAMIONETA: "Service de camioneta",
  REPUESTOS_VEHICULARES: "Repuestos vehiculares",
  REPUESTOS_PARA_BICICLETAS: "Repuestos para bicicletas",
  MANTENIMIENTO_DE_MATAFUEGOS: "Mantenimiento de matafuegos",
  SOPORTE_TECNICO_INFORMATICA: "Soporte tecnico / informatica",
  BONIFICACION: "Bonificacion",
  ASISTENCIA_MENSUAL: "Asistencia mensual",
  VACACIONES: "Vacaciones",
  GESTION_DE_SEGUROS: "Gestion de seguros",
  LICENCIA_MEDICA: "Licencia medica",
  OTRO: "Otro",
};
