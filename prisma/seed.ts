import { PrismaClient, type JuridicalAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getCloudflareR2Storage, sanitizeFileName } from "../src/lib/cloudflare-r2-core";
import { addArgentinaDateKeyDays, parseArgentinaDateTime, toArgentinaDateKey } from "../src/lib/argentina-time";

const prisma = new PrismaClient();

const password = "seguridad123";

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function daysAgo(days: number, hour = 10) {
  const dateKey = addArgentinaDateKeyDays(toArgentinaDateKey(), -days);
  return parseArgentinaDateTime(`${dateKey}T${String(hour).padStart(2, "0")}:00`);
}

function internalNumber(prefix: string, index: number) {
  return `${prefix}-2026-${String(index).padStart(4, "0")}`;
}

function actionContent(description: string, guidanceProvided = "", nextStepDescription = "") {
  return [
    ["Descripcion / relato", description],
    ["Intervencion realizada / orientacion brindada", guidanceProvided],
    ["Proxima accion", nextStepDescription],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}:\n${value}`)
    .join("\n\n");
}

const juridicalAuditInclude = {
  complainants: { orderBy: { sortOrder: "asc" as const } },
  linkedPersons: { orderBy: { sortOrder: "asc" as const } },
};

async function audit(
  module: string,
  entityType: string,
  entityId: string,
  action: string,
  createdById: string | null,
  after: unknown,
  before: unknown = null,
) {
  await prisma.auditLog.create({
    data: {
      module,
      entityType,
      entityId,
      action,
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: JSON.stringify(after),
      createdById,
    },
  });
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.retentionAttachment.deleteMany();
  await prisma.retentionHistory.deleteMany();
  await prisma.retention.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.juridicalAction.deleteMany();
  await prisma.juridicalIntervention.deleteMany();
  await prisma.dispatchFollowUp.deleteMany();
  await prisma.dispatchRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.internalExpedient.deleteMany();
  await prisma.catalogItem.deleteMany();
  await prisma.session.deleteMany();
  await prisma.externalPerson.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(password, 10);

  const users = await Promise.all(
    [
      ["despacho1", "Marta Acosta", "marta.acosta@municipio.local", "despacho"],
      ["despacho2", "Diego Rivas", "diego.rivas@municipio.local", "despacho"],
      ["despacho3", "Paola Nunez", "paola.nunez@municipio.local", "despacho"],
      ["despacho4", "Sergio Molina", "sergio.molina@municipio.local", "despacho"],
      ["juridico1", "Laura Benitez", "laura.benitez@municipio.local", "juridico"],
      ["juridico2", "Nicolas Ferreyra", "nicolas.ferreyra@municipio.local", "juridico"],
      ["juridico3", "Camila Torres", "camila.torres@municipio.local", "juridico"],
      ["directivo", "Andrea Puig", "andrea.puig@municipio.local", "directivo"],
      ["secretario", "Secretario Municipal", "secretario@municipio.local", "directivo"],
      ["admin", "Administrador Sistema", "admin@municipio.local", "admin"],
    ].map(([username, name, email, role]) =>
      prisma.user.create({
        data: { username, name, email, role, passwordHash },
      }),
    ),
  );

  const byUser = Object.fromEntries(users.map((user) => [user.username, user]));
  const adminId = byUser.admin.id;

  const personalAgendaOwners = [byUser.juridico1, byUser.despacho1, byUser.directivo, byUser.secretario];
  await prisma.appointment.createMany({
    data: [
      {
        title: "Audiencia laboral",
        date: "2026-05-15",
        startTime: "09:00",
        endTime: "10:00",
        calendarScope: "lawyers",
        createdByUserId: byUser.juridico1.id,
        assignedLawyerId: byUser.juridico1.id,
        assignedArea: "lawyers",
        clientName: "Juan Gomez",
        lawyerName: "Dra. Perez",
        type: "AUDIENCIA",
        status: "CONFIRMADA",
        location: "Tribunales",
        expedienteNumber: "LAB-1842-2026",
      },
      {
        title: "Consulta inicial",
        date: "2026-05-15",
        startTime: "11:30",
        endTime: "12:15",
        calendarScope: "lawyers",
        createdByUserId: byUser.juridico2.id,
        assignedLawyerId: byUser.juridico2.id,
        assignedArea: "lawyers",
        clientName: "Maria Martinez",
        lawyerName: "Dr. Lopez",
        type: "CONSULTA",
        status: "PENDIENTE",
        location: "Oficina",
      },
      {
        title: "Firma de contrato",
        date: "2026-05-15",
        startTime: "16:00",
        endTime: "16:45",
        calendarScope: "lawyers",
        createdByUserId: byUser.directivo.id,
        assignedLawyerId: byUser.juridico1.id,
        assignedArea: "lawyers",
        clientName: "Empresa Norte S.A.",
        lawyerName: "Dra. Perez",
        type: "FIRMA_DOCUMENTACION",
        status: "CONFIRMADA",
        location: "Oficina",
      },
      {
        title: "Preparar documentacion de expediente",
        date: "2026-05-15",
        startTime: "10:00",
        endTime: "11:00",
        calendarScope: "dispatch",
        createdByUserId: byUser.despacho1.id,
        assignedUserId: byUser.despacho1.id,
        assignedArea: "dispatch",
        type: "TAREA_ADMINISTRATIVA",
        status: "PENDIENTE",
        expedienteNumber: "EXP-4521-2026",
      },
      {
        title: "Presentar escrito en mesa de entrada",
        date: "2026-05-15",
        startTime: "12:00",
        endTime: "12:45",
        calendarScope: "dispatch",
        createdByUserId: byUser.despacho2.id,
        assignedUserId: byUser.despacho2.id,
        assignedArea: "dispatch",
        type: "GESTION_DOCUMENTAL",
        status: "CONFIRMADA",
        location: "Mesa de entrada",
      },
      {
        title: "Revisar documentacion faltante",
        date: "2026-05-15",
        startTime: "15:00",
        endTime: "15:45",
        calendarScope: "dispatch",
        createdByUserId: byUser.secretario.id,
        assignedUserId: byUser.despacho3.id,
        assignedArea: "dispatch",
        type: "GESTION_DOCUMENTAL",
        status: "PENDIENTE",
      },
      ...personalAgendaOwners.flatMap((owner) => [
        {
          title: "Recordatorio personal",
          date: "2026-05-15",
          startTime: "08:30",
          calendarScope: "personal",
          ownerUserId: owner.id,
          createdByUserId: owner.id,
          type: "RECORDATORIO",
          status: "PENDIENTE",
        },
        {
          title: "Llamada pendiente",
          date: "2026-05-15",
          startTime: "13:00",
          endTime: "13:20",
          calendarScope: "personal",
          ownerUserId: owner.id,
          createdByUserId: owner.id,
          type: "LLAMADA",
          status: "PENDIENTE",
        },
        {
          title: "Revision de tareas del dia",
          date: "2026-05-15",
          startTime: "17:30",
          endTime: "18:00",
          calendarScope: "personal",
          ownerUserId: owner.id,
          createdByUserId: owner.id,
          type: "RECORDATORIO",
          status: "PENDIENTE",
        },
      ]),
    ],
  });

  const catalogData = [
    ["dispatch_category", "DESPACHO", "RECLAMO", "Reclamo"],
    ["dispatch_category", "DESPACHO", "CONSULTA", "Consulta"],
    ["dispatch_category", "DESPACHO", "SUGERENCIA", "Sugerencia"],
    ["dispatch_category", "DESPACHO", "PEDIDO", "Pedido"],
    ["dispatch_category", "DESPACHO", "DERIVACION_AREA", "Derivacion a otra area"],
    ["dispatch_category", "DESPACHO", "SITUACION_VECINAL", "Situacion vecinal"],
    ["dispatch_category", "DESPACHO", "ATENCION_GENERAL", "Atencion general"],
    ["dispatch_area", "DESPACHO", "OBRAS_PUBLICAS", "Obras Publicas"],
    ["dispatch_area", "DESPACHO", "SERVICIOS_URBANOS", "Servicios Urbanos"],
    ["dispatch_area", "DESPACHO", "TRANSITO", "Transito"],
    ["dispatch_area", "DESPACHO", "DEFENSA_CIVIL", "Defensa Civil"],
    ["dispatch_area", "DESPACHO", "DESARROLLO_SOCIAL", "Desarrollo Social"],
    ["juridical_type", "JURIDICO", "DENUNCIA_VECINAL", "Denuncia vecinal"],
    ["juridical_type", "JURIDICO", "ORIENTACION", "Orientacion"],
    ["juridical_type", "JURIDICO", "PRIMERA_INTERVENCION", "Primera intervencion"],
    ["juridical_type", "JURIDICO", "INFORME_SITUACION", "Informe de situacion"],
    ["juridical_type", "JURIDICO", "MPF", "Actuacion vinculada a MPF"],
    ["juridical_type", "JURIDICO", "ASUNTOS_JURIDICOS", "Direccion de Asuntos Juridicos"],
    ["juridical_type", "JURIDICO", "VIOLENCIA_GENERO", "Violencia de genero"],
    ["juridical_type", "JURIDICO", "VIOLENCIA_FAMILIAR", "Violencia familiar"],
    ["juridical_type", "JURIDICO", "RUIDOS_MOLESTOS", "Ruidos molestos"],
    ["juridical_type", "JURIDICO", "MEDIANERAS", "Medianeras"],
    ["juridical_type", "JURIDICO", "HABILITACIONES", "Habilitaciones"],
    ["juridical_type", "JURIDICO", "OFICIO_URGENTE", "Oficio urgente"],
    ["juridical_type", "JURIDICO", "SALUD_MENTAL", "Salud mental"],
    ["juridical_type", "JURIDICO", "INTERVENCION_ADMINISTRATIVA", "Intervencion administrativa"],
    ["juridical_type", "JURIDICO", "NOTIFICACIONES", "Notificaciones"],
    ["juridical_type", "JURIDICO", "MEDIACION_VECINAL", "Mediacion vecinal"],
    ["juridical_type", "JURIDICO", "AUDIENCIA", "Audiencia"],
    ["intervention_context", "JURIDICO", "ASUNTOS_JURIDICOS", "Direccion de Asuntos Juridicos"],
    ["intervention_context", "JURIDICO", "GUM", "GUM"],
    ["intervention_context", "JURIDICO", "INFORMACION_SITUACIONES", "Informacion de situaciones"],
    ["intervention_context", "JURIDICO", "MESA_DENUNCIAS", "Mesa de denuncias"],
    ["intervention_context", "JURIDICO", "MPF", "MPF"],
    ["intervention_context", "JURIDICO", "OJOS_ALERTA", "Ojos en alerta"],
    ["intervention_context", "JURIDICO", "JUZGADO_CIVIL_CIAL", "Juzgado Civil / Cial"],
    ["intervention_context", "JURIDICO", "JUZGADO_FAMILIA", "Juzgado de familia"],
    ["intervention_context", "JURIDICO", "JUZGADO_PAZ", "Juzgado de paz"],
    ["intervention_context", "JURIDICO", "POLITICA_SOCIAL", "Politica social"],
    ["intervention_context", "JURIDICO", "OTRO", "Otro"],
    ["expedient_category", "DESPACHO", "AYUDA_ECONOMICA", "Ayuda economica"],
    ["expedient_category", "DESPACHO", "HONORARIOS", "Honorarios"],
    ["expedient_category", "DESPACHO", "CONTRATOS_DE_PERSONAL", "Contratos de personal"],
    ["expedient_category", "DESPACHO", "SOLICITUD_DE_INFORMES", "Solicitud de informes"],
    ["expedient_category", "DESPACHO", "INFORMES_NOVEDADES_SERENOS", "Informes / novedades de serenos"],
    ["expedient_category", "DESPACHO", "SOLICITUD_DE_INDUMENTARIA", "Solicitud de indumentaria"],
    ["expedient_category", "DESPACHO", "SOLICITUD_DE_CAMARAS", "Solicitud de camaras"],
    ["expedient_category", "DESPACHO", "SOLICITUD_DE_ELEMENTOS_DE_TRANSITO", "Solicitud de elementos de transito"],
    ["expedient_category", "DESPACHO", "PEDIDO_DE_ALFALFA_PARA_EQUINOS", "Pedido de alfalfa para equinos"],
    ["expedient_category", "DESPACHO", "PAGO_DE_FACTURA", "Pago de factura"],
    ["expedient_category", "DESPACHO", "PEDIDO_DE_PAGO_DE_FACTURA", "Pedido de pago de factura"],
    ["expedient_category", "DESPACHO", "REINTEGROS", "Reintegros"],
    ["expedient_category", "DESPACHO", "ALQUILERES", "Alquileres"],
    ["expedient_category", "DESPACHO", "INSUMOS_DE_LIBRERIA", "Insumos de libreria"],
    ["expedient_category", "DESPACHO", "ELEMENTOS_DE_LIMPIEZA", "Elementos de limpieza"],
    ["expedient_category", "DESPACHO", "ELEMENTOS_PARA_REACONDICIONAMIENTO", "Elementos para reacondicionamiento"],
    ["expedient_category", "DESPACHO", "VETERINARIA", "Veterinaria"],
    ["expedient_category", "DESPACHO", "MECANICA_MANTENIMIENTO_VEHICULAR", "Mecanica / mantenimiento vehicular"],
    ["expedient_category", "DESPACHO", "SERVICE_DE_CAMIONETA", "Service de camioneta"],
    ["expedient_category", "DESPACHO", "REPUESTOS_VEHICULARES", "Repuestos vehiculares"],
    ["expedient_category", "DESPACHO", "REPUESTOS_PARA_BICICLETAS", "Repuestos para bicicletas"],
    ["expedient_category", "DESPACHO", "MANTENIMIENTO_DE_MATAFUEGOS", "Mantenimiento de matafuegos"],
    ["expedient_category", "DESPACHO", "SOPORTE_TECNICO_INFORMATICA", "Soporte tecnico / informatica"],
    ["expedient_category", "DESPACHO", "BONIFICACION", "Bonificacion"],
    ["expedient_category", "DESPACHO", "ASISTENCIA_MENSUAL", "Asistencia mensual"],
    ["expedient_category", "DESPACHO", "VACACIONES", "Vacaciones"],
    ["expedient_category", "DESPACHO", "GESTION_DE_SEGUROS", "Gestion de seguros"],
    ["expedient_category", "DESPACHO", "LICENCIA_MEDICA", "Licencia medica"],
    ["expedient_category", "DESPACHO", "OTRO", "Otro"],
  ];

  await prisma.catalogItem.createMany({
    data: catalogData.map(([type, module, value, label], index) => ({
      type,
      module,
      value,
      label,
      sortOrder: index + 1,
      createdById: adminId,
    })),
  });

  const people = await Promise.all(
    [
      ["30111222", "Ramon", "Silva", "11 5420-1102", "Calle 12 1410"],
      ["28555111", "Claudia", "Gomez", "11 6044-2231", "Av. San Martin 822"],
      ["36777888", "Marina", "Ojeda", "11 5090-3377", "Los Pinos 244"],
      ["40888999", "Ezequiel", "Paz", "11 6377-9912", "Barrio Norte Mz 4 Casa 8"],
      ["24999123", "Silvia", "Maldonado", "11 4412-9081", "Mitre 730"],
      ["33222111", "Hector", "Luna", "11 6020-7780", "Las Heras 188"],
      ["42666777", "Daniela", "Ruiz", "11 4701-2233", "Sarmiento 521"],
      ["39123456", "Luciano", "Arias", "11 6688-1290", "Belgrano 950"],
      ["34555666", "Noelia", "Farias", "11 5577-0101", "9 de Julio 101"],
    ].map(([dni, firstName, lastName, phone1, address]) =>
      prisma.externalPerson.create({
        data: {
          dni,
          firstName,
          lastName,
          fullNameNormalized: normalizeName(`${firstName} ${lastName}`),
          phone1,
          address,
        },
      }),
    ),
  );

  const dispatchRecords = [];
  const dispatchSeeds = [
    [0, "RECLAMO", "ALTA", "EN_GESTION", "Falta de luminaria en esquina con alto transito peatonal.", "Servicios Urbanos", byUser.despacho1.id, daysAgo(0, 9)],
    [1, "CONSULTA", "MEDIA", "RECIBIDO", "Consulta sobre procedimiento para denunciar ruidos reiterados en horario nocturno.", null, byUser.despacho2.id, daysAgo(1, 11)],
    [2, "SITUACION_VECINAL", "URGENTE", "DERIVADO", "Vecina solicita intervencion por conflicto persistente con inmueble lindero.", null, byUser.despacho3.id, daysAgo(2, 12)],
    [3, "PEDIDO", "MEDIA", "EN_ANALISIS", "Pedido de refuerzo de patrullaje preventivo en zona escolar.", "Patrulla Municipal", byUser.despacho1.id, daysAgo(3, 8)],
    [4, "DERIVACION_AREA", "BAJA", "DERIVADO", "Solicitud por poda y despeje de camara urbana parcialmente tapada.", "Obras Publicas", byUser.despacho4.id, daysAgo(5, 10)],
    [5, "ATENCION_GENERAL", "MEDIA", "RESUELTO", "Se informaron canales de contacto y horarios de atencion municipal.", null, byUser.despacho2.id, daysAgo(6, 14)],
    [6, "RECLAMO", "ALTA", "EN_GESTION", "Reclamo por vehiculos abandonados en acceso a barrio.", "Transito", byUser.despacho3.id, daysAgo(7, 9)],
    [7, "SUGERENCIA", "BAJA", "RECIBIDO", "Sugerencia para mejorar senalizacion cerca de plaza central.", null, byUser.despacho4.id, daysAgo(8, 15)],
    [8, "PEDIDO", "URGENTE", "RECIBIDO", "Pedido recibido desde Intervenciones para preservar registro de camaras por oficio urgente.", "Centro de Monitoreo", byUser.despacho1.id, daysAgo(1, 16), "FROM_JURIDICO"],
  ];

  for (const [index, seed] of dispatchSeeds.entries()) {
    const [personIndex, category, priority, status, description, referredArea, createdById, attendedAt, origin = "DIRECT"] = seed as [
      number,
      string,
      string,
      string,
      string,
      string | null,
      string,
      Date,
      string?,
    ];
    const person = people[personIndex];
    const record = await prisma.dispatchRecord.create({
      data: {
        internalNumber: internalNumber("DES", index + 1),
        attendedAt,
        usesHistoricalDate: true,
        createdById,
        personId: person.id,
        dniSnapshot: person.dni,
        nameSnapshot: `${person.firstName} ${person.lastName}`,
        description,
        category,
        priority,
        status,
        referredArea,
        origin,
        lastStatusAt: attendedAt,
        confidentialNotes: status === "DERIVADO" ? "Derivacion registrada con resumen funcional." : null,
        linkedPersons: {
          create: [
            {
              sortOrder: 0,
              dni: person.dni,
              firstName: person.firstName,
              apellidoApodoManual: person.lastName,
              phone1: person.phone1,
              phone2: person.phone2,
              address: person.address,
            },
          ],
        },
      },
    });
    dispatchRecords.push(record);
    await audit("DESPACHO", "DispatchRecord", record.id, "CREATE", createdById, {
      internalNumber: record.internalNumber,
      status: record.status,
      category: record.category,
    });
  }

  await prisma.dispatchFollowUp.createMany({
    data: [
      {
        dispatchRecordId: dispatchRecords[0].id,
        content: "Se cargo reclamo y se solicito verificacion al equipo de servicios urbanos.",
        statusAfter: "EN_GESTION",
        createdById: byUser.despacho1.id,
        createdAt: daysAgo(0, 10),
      },
      {
        dispatchRecordId: dispatchRecords[2].id,
        content: "Se derivo a Intervenciones Juridico-Institucionales con resumen minimo necesario.",
        statusAfter: "DERIVADO",
        createdById: byUser.despacho3.id,
        createdAt: daysAgo(2, 13),
      },
      {
        dispatchRecordId: dispatchRecords[5].id,
        content: "Atencion resuelta en mostrador. Se informaron telefonos utiles.",
        statusAfter: "RESUELTO",
        createdById: byUser.despacho2.id,
        createdAt: daysAgo(6, 15),
      },
    ],
  });

  const interventions = [];
  const interventionSeeds = [
    [2, "MEDIACION_VECINAL", "ALTA", "RECIBIDO", "Orientacion inicial por conflicto vecinal con antecedentes de hostigamiento verbal.", "ORIENTACION", byUser.juridico1.id, daysAgo(2, 14), "FROM_DESPACHO"],
    [1, "RUIDOS_MOLESTOS", "MEDIA", "EN_ORIENTACION", "Se recibe denuncia vecinal por ruidos nocturnos persistentes. Se brindan pautas de registro.", "ORIENTACION", byUser.juridico2.id, daysAgo(1, 12)],
    [6, "OFICIO_URGENTE", "URGENTE", "PENDIENTE_DOCUMENTACION", "Oficio urgente vinculado a preservacion de registros municipales.", "MPF", byUser.juridico3.id, daysAgo(0, 9)],
    [4, "SALUD_MENTAL", "URGENTE", "EN_SEGUIMIENTO", "Primera intervencion y contencion. Se informa canal especializado y medidas disponibles.", "OTRO", byUser.juridico1.id, daysAgo(4, 11)],
    [5, "MEDIANERAS", "MEDIA", "RECIBIDO", "Orientacion por disputa de medianera y filtraciones denunciadas por vecino.", "ORIENTACION", byUser.juridico2.id, daysAgo(5, 10)],
    [7, "HABILITACIONES", "BAJA", "CONCLUIDO", "Consulta por requisitos y area competente en habilitaciones comerciales.", "ASUNTOS_JURIDICOS", byUser.juridico3.id, daysAgo(9, 13)],
    [8, "INTERVENCION_ADMINISTRATIVA", "MEDIA", "CONCLUIDO", "Se brinda informacion sobre patrocinio juridico gratuito y horarios de consulta.", "ORIENTACION", byUser.juridico1.id, daysAgo(10, 10)],
  ];

  for (const [index, seed] of interventionSeeds.entries()) {
    const [personIndex, type, urgency, status, description, interventionContext, createdById, attendedAt, origin = "DIRECT"] = seed as [
      number,
      string,
      string,
      string,
      string,
      string,
      string,
      Date,
      string?,
    ];
    const person = people[personIndex];
    const intervention = await prisma.juridicalIntervention.create({
      data: {
        internalNumber: internalNumber("JI", index + 1),
        attendedAt,
        createdById,
        personId: person.id,
        dniSnapshot: person.dni,
        nameSnapshot: `${person.firstName} ${person.lastName}`,
        type,
        urgency,
        status,
        description,
        interventionContext,
        counterpartType: null,
        guidanceProvided:
          type === "INTERVENCION_ADMINISTRATIVA"
            ? "Se informaron instituciones y dias de atencion gratuita."
            : "Se registro orientacion inicial y pasos recomendados.",
        oficioNumber: type === "OFICIO_URGENTE" ? "OF-2026-1187-MPF" : null,
        expedienteNumber: type === "OFICIO_URGENTE" ? "MPF-2026-0442" : null,
        origin,
        lastStatusAt: attendedAt,
        linkedPersons: {
          create: [
            {
              sortOrder: 0,
              dni: person.dni,
              firstName: person.firstName,
              apellidoApodoManual: person.lastName,
              phone1: person.phone1,
              phone2: person.phone2,
              address: person.address,
            },
          ],
        },
      },
    });
    interventions.push(intervention);
    await audit("JURIDICO", "JuridicalIntervention", intervention.id, "CREATE", createdById, {
      internalNumber: intervention.internalNumber,
      status: intervention.status,
      type: intervention.type,
    });
  }

  const juridicalActions: JuridicalAction[] = [];
  const juridicalActionSeeds = [
    {
      juridicalInterventionId: interventions[0].id,
      actionType: "SEGUIMIENTO",
      content: actionContent(
        "La persona vuelve a consultar por nuevas comunicaciones con el inmueble lindero y aporta mayor detalle de horarios.",
        "Se ordena el relato, se indican pautas de registro y se deja constancia de la continuidad del conflicto.",
        "Contactar a las partes para evaluar instancia de mediacion vecinal.",
      ),
      nextStepDate: daysAgo(-3, 10),
      statusAfter: "EN_ORIENTACION",
      createdById: byUser.juridico2.id,
      createdAt: daysAgo(2, 15),
    },
    {
      juridicalInterventionId: interventions[0].id,
      actionType: "NUEVA_PRESENTACION",
      content: actionContent(
        "Se recibe nueva presentacion con ampliacion de datos y referencia a intervenciones previas del barrio.",
        "Se incorpora la informacion al legajo y se define seguimiento institucional.",
        "Revisar antecedentes y preparar contacto con area de mediacion.",
      ),
      nextStepDate: daysAgo(-1, 12),
      statusAfter: "EN_SEGUIMIENTO",
      createdById: byUser.juridico1.id,
      createdAt: daysAgo(1, 9),
    },
    {
      juridicalInterventionId: interventions[0].id,
      actionType: "CONTENCION",
      content: actionContent(
        "Se atiende consulta telefonica de la solicitante, quien manifiesta preocupacion por escalada del conflicto.",
        "Se brinda contencion, se reiteran canales institucionales y se solicita evitar confrontaciones directas.",
        "Mantener seguimiento y registrar cualquier nueva presentacion.",
      ),
      nextStepDate: daysAgo(-2, 11),
      createdById: byUser.juridico3.id,
      createdAt: daysAgo(0, 13),
    },
    {
      juridicalInterventionId: interventions[2].id,
      actionType: "OFICIO",
      content: actionContent(
        "Se verifica documentacion recibida y se solicita preservacion de camaras a Despacho.",
        "Se emite pedido operativo con datos minimos necesarios para resguardar registros.",
        "Controlar respuesta de Despacho.",
      ),
      nextStepDate: daysAgo(-1, 9),
      createdById: byUser.juridico3.id,
      createdAt: daysAgo(0, 10),
    },
    {
      juridicalInterventionId: interventions[3].id,
      actionType: "CONTENCION",
      content: actionContent(
        "Se brinda contencion, se registran organismos de contacto y se agenda seguimiento.",
        "Se informa canal especializado y se deja constancia de los recursos disponibles.",
        "Retomar contacto para evaluar continuidad de la intervencion.",
      ),
      nextStepDate: daysAgo(-2, 11),
      createdById: byUser.juridico1.id,
      createdAt: daysAgo(4, 12),
    },
    {
      juridicalInterventionId: interventions[5].id,
      actionType: "ORIENTACION",
      content: actionContent(
        "Consulta finalizada con indicacion del area competente.",
        "Se informa procedimiento y documentacion requerida para continuar por la via administrativa.",
      ),
      createdById: byUser.juridico3.id,
      createdAt: daysAgo(9, 14),
    },
  ];

  for (const seed of juridicalActionSeeds) {
    const { statusAfter, ...actionData } = seed;
    const before = await prisma.juridicalIntervention.findUniqueOrThrow({
      where: { id: seed.juridicalInterventionId },
      include: juridicalAuditInclude,
    });
    const action = await prisma.juridicalAction.create({ data: actionData });
    juridicalActions.push(action);
    const after =
      statusAfter && statusAfter !== before.status
        ? await prisma.juridicalIntervention.update({
            where: { id: seed.juridicalInterventionId },
            data: { status: statusAfter, lastStatusAt: action.createdAt },
            include: juridicalAuditInclude,
          })
        : before;

    await audit(
      "JURIDICO",
      "JuridicalIntervention",
      seed.juridicalInterventionId,
      after.status !== before.status ? "STATUS_CHANGE" : "ACTION",
      seed.createdById,
      { intervention: after, action },
      before,
    );
  }

  const referralOne = await prisma.referral.create({
    data: {
      originModule: "DESPACHO",
      destinationModule: "JURIDICO",
      originDispatchRecordId: dispatchRecords[2].id,
      destinationJuridicalInterventionId: interventions[0].id,
      summary: "Conflicto vecinal persistente. Se remite resumen de atencion y datos de contacto.",
      status: "RECIBIDA",
      visibleStatusForOrigin: "Recibida por Intervenciones - en seguimiento",
      referredById: byUser.despacho3.id,
      referredAt: daysAgo(2, 13),
    },
  });
  await audit("DESPACHO", "Referral", referralOne.id, "REFERRAL", byUser.despacho3.id, referralOne);

  const referralTwo = await prisma.referral.create({
    data: {
      originModule: "JURIDICO",
      destinationModule: "DESPACHO",
      originJuridicalInterventionId: interventions[2].id,
      destinationDispatchRecordId: dispatchRecords[8].id,
      summary: "Solicitud operativa para preservar registros de camaras segun oficio urgente.",
      status: "PENDIENTE",
      visibleStatusForOrigin: "Pendiente de gestion en Despacho",
      referredById: byUser.juridico3.id,
      referredAt: daysAgo(0, 11),
    },
  });
  await audit("JURIDICO", "Referral", referralTwo.id, "REFERRAL", byUser.juridico3.id, referralTwo);

  const expedients = [];
  const expedientSeeds = [
    ["SOLICITUD_DE_INDUMENTARIA", "GENE00165", "EXP-4521-2026", "GUM", "Compra de linternas y chalecos reflectivos.", "Elementos de apoyo operativo para personal de calle.", "EN_TRAMITE", byUser.despacho1.id],
    ["MECANICA_MANTENIMIENTO_VEHICULAR", "GENE00156", "EXP-4522-2026", "GUM", "Mantenimiento preventivo de moviles municipales.", "Revision general y compra de insumos vinculados.", "OBSERVADO", byUser.despacho2.id],
    ["ASISTENCIA_MENSUAL", "GENE00162", "EXP-4523-2026", "SECRETARIA", "Liquidacion de horas adicionales.", "Expediente interno de asistencia y carga mensual.", "EN_APROBACION", byUser.despacho3.id],
    ["PAGO_DE_FACTURA", "GENE00141", "EXP-4524-2026", "DIRECCION_DE_SEGURIDAD", "Pago de factura administrativa.", "Solicitud de aprobacion y registracion de pago.", "APROBADO", byUser.despacho4.id],
    ["INSUMOS_DE_LIBRERIA", "GENE00148", "EXP-4525-2026", "SECRETARIA", "Reposicion de toner, papel y carpetas.", "Compra para funcionamiento ordinario de despacho.", "INICIADO", byUser.despacho1.id],
    ["SOPORTE_TECNICO_INFORMATICA", "GENE00170", "EXP-4526-2026", "DIRECCION_DE_SEGURIDAD", "Actualizacion de equipos de comunicacion interna.", "Revision tecnica y seguimiento de proveedor.", "EN_TRAMITE", byUser.despacho2.id],
    ["OTRO", "GENE00176", "EXP-4527-2026", "DEFENSA_CIVIL", "Gestion administrativa por credenciales internas.", "Tramite general sin categoria especifica.", "FINALIZADO", byUser.despacho3.id],
  ];

  for (const [index, [category, codigo, expedienteNumber, area, description, observation, status, createdById]] of expedientSeeds.entries()) {
    const expedient = await prisma.internalExpedient.create({
      data: {
        internalNumber: internalNumber("ADM", index + 1),
        expedienteNumber,
        codigo,
        category,
        area,
        description,
        observation,
        status,
        createdById,
      },
    });
    expedients.push(expedient);
    await audit("DESPACHO", "InternalExpedient", expedient.id, "CREATE", createdById, {
      internalNumber: expedient.internalNumber,
      status: expedient.status,
      codigo: expedient.codigo,
      category: expedient.category,
      area: expedient.area,
    });
  }

  const retentionSeeds = [
    {
      internalNumber: internalNumber("RET", 1),
      dateTime: daysAgo(2, 15),
      actNumber: "1287",
      actType: "ALCOHOLEMIA",
      recordNumber: "4421",
      domain: "AB123CD",
      engineNumber: null,
      chassisNumber: null,
      vehicleType: "AUTO",
      brand: "Toyota",
      color: "Gris",
      description: "Control preventivo con resultado positivo. Vehiculo trasladado al corralon municipal.",
      status: "PENDIENTE",
      createdById: byUser.despacho1.id,
    },
    {
      internalNumber: internalNumber("RET", 2),
      dateTime: daysAgo(3, 19),
      actNumber: "1286",
      actType: "INFRACCION",
      recordNumber: "4419",
      domain: "A112BCD",
      engineNumber: null,
      chassisNumber: "8AJBA3CD4E1234567",
      vehicleType: "CAMIONETA",
      brand: "Ford",
      color: "Blanco",
      description: "Retencion por falta de documentacion obligatoria durante operativo nocturno.",
      status: "ENTREGADO",
      createdById: byUser.despacho2.id,
    },
    {
      internalNumber: internalNumber("RET", 3),
      dateTime: daysAgo(4, 10),
      actNumber: "1285",
      actType: "INFRACCION",
      recordNumber: "4415",
      domain: null,
      engineNumber: "E3J739502",
      chassisNumber: "9C2KC2200MR000182",
      vehicleType: "MOTO",
      brand: "Honda",
      color: "Negro",
      description: "Motovehiculo retenido por circular sin dominio visible y sin documentacion respaldatoria.",
      status: "PENDIENTE",
      createdById: byUser.despacho3.id,
    },
  ];

  const retentions = [];
  for (const seed of retentionSeeds) {
    const retention = await prisma.retention.create({ data: seed });
    retentions.push(retention);
    await audit("RETENCIONES", "Retention", retention.id, "CREATE", seed.createdById, {
      internalNumber: retention.internalNumber,
      status: retention.status,
      actNumber: retention.actNumber,
    });
  }

  await prisma.retentionHistory.create({
    data: {
      retentionId: retentions[1].id,
      field: "status",
      oldValue: "Pendiente",
      newValue: "Entregado",
      editedById: byUser.despacho4.id,
      editedAt: daysAgo(1, 10),
    },
  });

  const sampleFiles = [
    {
      name: "seed-despacho-luminaria.txt",
      content: "Adjunto semilla: fotografia referenciada de luminaria sin funcionar.",
      module: "DESPACHO",
      entityType: "DispatchRecord",
      entityId: dispatchRecords[0].id,
      uploadedById: byUser.despacho1.id,
      isPrivate: false,
    },
    {
      name: "seed-juridico-oficio.txt",
      content: "Adjunto semilla privado: referencia interna de oficio urgente.",
      module: "JURIDICO",
      entityType: "JuridicalIntervention",
      entityId: interventions[2].id,
      uploadedById: byUser.juridico3.id,
      isPrivate: true,
    },
    {
      name: "seed-juridico-hoja-presentacion.txt",
      content: "Adjunto semilla privado: documentacion aportada en nueva presentacion.",
      module: "JURIDICO",
      entityType: "JuridicalAction",
      entityId: juridicalActions[1].id,
      uploadedById: byUser.juridico1.id,
      isPrivate: true,
    },
    {
      name: "seed-expediente-compra.txt",
      content: "Adjunto semilla: presupuesto preliminar de insumos operativos.",
      module: "DESPACHO",
      entityType: "InternalExpedient",
      entityId: expedients[0].id,
      uploadedById: byUser.despacho1.id,
      isPrivate: false,
    },
  ];

  const storage = getCloudflareR2Storage();
  for (const file of sampleFiles) {
    const content = Buffer.from(file.content, "utf8");
    const stored = await storage.ensureSeedObject(content);
    await prisma.attachment.create({
      data: {
        module: file.module,
        entityType: file.entityType,
        entityId: file.entityId,
        fileName: sanitizeFileName(file.name),
        originalName: file.name,
        objectKey: stored.objectKey,
        encryptionVersion: stored.encryptionVersion,
        mimeType: "text/plain",
        size: content.byteLength,
        uploadedById: file.uploadedById,
        isPrivate: file.isPrivate,
      },
    });
  }

  console.log("Seed completado");
  console.table(
    users.map((user) => ({
      username: user.username,
      role: user.role,
      password,
    })),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
//comm
