# Secretaria de Seguridad Municipal

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
- PostgreSQL (Neon)
- Autenticacion local con credenciales y sesiones en base
- Adjuntos cifrados en Cloudflare R2

## Puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Verificar `.env`:

Las variables requeridas estan documentadas en `.env.example`. La clave
`R2_FILE_ENCRYPTION_KEY_V1` debe generarse una sola vez, guardarse como secreto y
respaldarse: sin ella los adjuntos cifrados no se pueden recuperar.

La URL de ejecucion `DATABASE_URL` usa el endpoint pooler de Neon y debe incluir
`pgbouncer=true`; `DATABASE_URL_UNPOOLED` conserva el endpoint directo para las
migraciones. Todas las fechas operativas se interpretan y muestran en
`America/Argentina/Buenos_Aires`, mientras PostgreSQL guarda instantes con zona
horaria para que el servidor pueda ejecutarse en cualquier region.

3. Crear/aplicar migraciones y generar Prisma Client:

```bash
npm run db:migrate
```

4. Sincronizar los catalogos usados por los selectores:

```bash
npm run db:seed
```

Este seed es seguro e idempotente: crea o corrige solamente las opciones
canonicas de `CatalogItem`. No elimina usuarios, expedientes, personas,
adjuntos ni opciones personalizadas.

5. Ejecutar en local:

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Datos demo opcionales

La carga demo completa es destructiva y no forma parte del seed
predeterminado. Elimina los datos existentes antes de recrearlos y solo debe
usarse en una base descartable. En PowerShell requiere esta confirmacion:

```powershell
$env:ALLOW_DESTRUCTIVE_DEMO_SEED="YES_DELETE_EXISTING_DATA"
npm run db:seed:demo
```

Los siguientes usuarios se crean unicamente mediante `db:seed:demo`. Todos
usan la contrasena `seguridad123`.

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
- `directivo`: acceso completo a todos los modulos y acciones.
- `admin`: administracion tecnica de usuarios, catalogos y auditoria. No se usa como rol operativo de detalle sensible.

La privacidad entre modulos se resuelve con registros separados (`DispatchRecord` y `JuridicalIntervention`) unidos por `Referral`. Una derivacion comparte un resumen funcional, pero el detalle posterior del modulo destino no queda expuesto al modulo origen.

## Funcionalidades incluidas

- Login local sin servicios externos.
- Sidebar institucional responsive.
- Dashboard con KPIs y actividad reciente.
- Listados con filtros por fecha, DNI, nombre, categoria/tipo, estado y usuario.
- Formularios de alta y edicion.
- Detalle con secciones, badges de estado, seguimientos/actuaciones y auditoria.
- Adjuntos cifrados en Cloudflare R2 con descarga autenticada y controlada por permisos.
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
  seed-demo.ts
  catalog-selector-sync.ts
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
    api/retenciones/[id]/archivos
  components/
    layout/
    ui/
  lib/
    auth.ts
    rbac.ts
    prisma.ts
    audit.ts
    files.ts
    cloudflare-r2.ts
    cloudflare-r2-core.ts
```

## Almacenamiento de archivos

Todos los adjuntos persistentes se cifran con AES-256-GCM antes de subirlos al
bucket configurado. La aplicacion solo crea y lee objetos bajo el prefijo
`secretaria-de-seguridad/`; no lista ni elimina objetos del bucket. Los legajos
PDF se generan bajo demanda y no se persisten.

## Sincronizacion en produccion

Despues de aplicar migraciones, ejecutar explicitamente `npm run db:seed` con
las variables de la base del ambiente correspondiente. El comando `build` no
escribe en la base de datos y no ejecuta semillas automaticamente.

## Comandos utiles

```bash
npm run lint
npm test
npm run build
npm run db:migrate
npm run db:seed
npm run db:seed:demo # solo bases descartables y con confirmacion explicita
npm run db:reset
```
