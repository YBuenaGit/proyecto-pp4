# Secretaria de Seguridad Municipal - MVP local

Aplicacion web interna para una Secretaria de Seguridad municipal. Implementa dos modulos separados por permisos y una base compartida:

- Despacho de la Secretaria
- Intervenciones Juridico-Institucionales
- Expedientes internos dentro de Despacho
- Personas compartidas
- Reportes simples
- Administracion tecnica

No hay portal ciudadano, registro publico ni mesa de entrada comun. Los registros se cargan directamente en cada modulo.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite local
- Autenticacion local con credenciales y sesiones en base
- Adjuntos en disco local (`storage/uploads`)

## Puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Verificar `.env`:

```env
DATABASE_URL="file:./dev.db"
```

3. Crear/aplicar migraciones y generar Prisma Client:

```bash
npm run db:migrate
```

4. Cargar datos semilla:

```bash
npm run db:seed
```

5. Ejecutar en local:

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Usuarios seed

Todos usan la contrasena `seguridad123`.

| Usuario | Rol |
| --- | --- |
| `despacho1` | despacho |
| `despacho2` | despacho |
| `despacho3` | despacho |
| `despacho4` | despacho |
| `juridico1` | juridico |
| `juridico2` | juridico |
| `juridico3` | juridico |
| `directivo` | directivo |
| `secretario` | directivo |
| `admin` | admin |

## Permisos implementados

- `despacho`: atenciones/reclamos, seguimientos, adjuntos, derivaciones, expedientes internos y busquedas de Despacho.
- `juridico`: intervenciones, actuaciones, adjuntos privados, derivaciones recibidas y busquedas juridico-institucionales.
- `directivo`: visibilidad completa de Despacho, Intervenciones, Expedientes, Personas y Reportes.
- `admin`: administracion tecnica de usuarios, catalogos y auditoria. No se usa como rol operativo de detalle sensible.

La privacidad entre modulos se resuelve con registros separados (`DispatchRecord` y `JuridicalIntervention`) unidos por `Referral`. Una derivacion comparte un resumen funcional, pero el detalle posterior del modulo destino no queda expuesto al modulo origen.

## Funcionalidades incluidas

- Login local sin servicios externos.
- Sidebar institucional responsive.
- Dashboard con KPIs y actividad reciente.
- Listados con filtros por fecha, DNI, nombre, categoria/tipo, estado y usuario.
- Formularios de alta y edicion.
- Detalle con secciones, badges de estado, seguimientos/actuaciones y auditoria.
- Adjuntos locales con descarga controlada por permisos.
- Derivacion Despacho -> Intervenciones.
- Derivacion Intervenciones -> Despacho preparada y funcional.
- Expedientes internos administrativos.
- Personas compartidas con historial visible segun rol.
- Reportes simples por categoria, estado, tipo, usuario y periodo.
- Administracion basica de usuarios y catalogos.

## Estructura relevante

```text
prisma/
  schema.prisma
  seed.ts
  migrations/
src/
  app/
    (auth)/login
    (app)/despacho
    (app)/intervenciones
    (app)/personas
    (app)/reportes
    (app)/administracion
    adjuntos/[id]
  components/
    layout/
    ui/
  lib/
    auth.ts
    rbac.ts
    prisma.ts
    audit.ts
    files.ts
storage/
  uploads/
```

## Migracion futura a PostgreSQL

El modelo evita tipos especificos de SQLite y guarda estados/categorias como strings mas catalogos administrables. Para migrar:

1. Cambiar el provider de Prisma a `postgresql`.
2. Actualizar `DATABASE_URL`.
3. Crear una nueva migracion contra PostgreSQL.
4. Mantener los mismos modelos y relaciones principales.

## Comandos utiles

```bash
npm run lint
npm run build
npm run db:migrate
npm run db:seed
npm run db:reset
```
