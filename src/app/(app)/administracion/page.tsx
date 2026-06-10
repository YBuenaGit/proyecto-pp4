import { Plus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import { FormField, FormGrid, inputClass } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, ROLES } from "@/lib/constants";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessAdmin } from "@/lib/rbac";
import { createCatalogItem, createUser, toggleUserActive } from "./actions";

export default async function AdminPage() {
  const user = await requireUser();
  assertAccess(canAccessAdmin(user));

  const [users, catalogItems, auditLogs] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.catalogItem.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }], take: 80 }),
    prisma.auditLog.findMany({ include: { createdBy: true }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  return (
    <>
      <PageHeader
        title="Administracion"
        description="Gestion tecnica de usuarios, roles, catalogos iniciales y auditoria del sistema."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Administracion" }]}
      />

      <div className="space-y-5">
        <DetailSection
          title="Usuarios"
          action={
            <AppModal title="Crear usuario" trigger={<><Plus className="h-4 w-4" />Nuevo usuario</>} size="lg">
              <form action={createUser} className="space-y-4">
                <FormGrid>
                  <FormField label="Nombre">
                    <input name="name" className={inputClass} required />
                  </FormField>
                  <FormField label="Usuario">
                    <input name="username" className={inputClass} required />
                  </FormField>
                  <FormField label="Email">
                    <input name="email" type="email" className={inputClass} />
                  </FormField>
                  <FormField label="Rol">
                    <select name="role" className={inputClass} defaultValue="despacho">
                      {Object.values(ROLES).map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Contrasena inicial">
                    <input name="password" type="password" minLength={6} className={inputClass} required />
                  </FormField>
                </FormGrid>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit">Crear</Button>
                  <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                </div>
              </form>
            </AppModal>
          }
        >
          <Table title="Usuarios" itemLabel="usuarios" total={users.length} showPagination={false} headers={["Nombre", "Usuario", "Rol", "Estado", "Creado", "Accion"]} empty={!users.length}>
            {users.map((item) => (
              <tr key={item.id}>
                <Td>
                  <div className="font-medium text-[#212529]">{item.name}</div>
                  <div className="text-xs text-[#6c757d]">{item.email ?? "-"}</div>
                </Td>
                <Td>{item.username}</Td>
                <Td>{ROLE_LABELS[item.role] ?? item.role}</Td>
                <Td><StatusBadge value={item.active ? "ACTIVO" : "INACTIVO"} /></Td>
                <Td>{formatDateTime(item.createdAt)}</Td>
                <Td>
                  <form action={toggleUserActive.bind(null, item.id)}>
                    <Button type="submit" variant="secondary" className="h-8 px-3">
                      {item.active ? "Desactivar" : "Activar"}
                    </Button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        </DetailSection>

        <DetailSection
          title="Catalogos"
          action={
            <AppModal title="Crear catalogo" trigger={<><Plus className="h-4 w-4" />Nuevo catalogo</>} size="lg">
              <form action={createCatalogItem} className="space-y-4">
                <FormGrid>
                  <FormField label="Tipo">
                    <input name="type" className={inputClass} placeholder="dispatch_category" required />
                  </FormField>
                  <FormField label="Modulo">
                    <input name="module" className={inputClass} placeholder="DESPACHO / JURIDICO" />
                  </FormField>
                  <FormField label="Valor tecnico">
                    <input name="value" className={inputClass} placeholder="NUEVO_VALOR" required />
                  </FormField>
                  <FormField label="Etiqueta">
                    <input name="label" className={inputClass} required />
                  </FormField>
                  <FormField label="Orden">
                    <input name="sortOrder" type="number" className={inputClass} defaultValue={0} />
                  </FormField>
                </FormGrid>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit">Crear</Button>
                  <Button type="button" variant="secondary" data-modal-close>Cancelar</Button>
                </div>
              </form>
            </AppModal>
          }
        >
          <Table title="Catalogos" itemLabel="catalogos" total={catalogItems.length} showPagination={false} headers={["Tipo", "Modulo", "Valor", "Etiqueta", "Estado"]} empty={!catalogItems.length}>
            {catalogItems.map((item) => (
              <tr key={item.id}>
                <Td>{item.type}</Td>
                <Td>{item.module ?? "-"}</Td>
                <Td>{item.value}</Td>
                <Td>{item.label}</Td>
                <Td><StatusBadge value={item.active ? "ACTIVO" : "INACTIVO"} /></Td>
              </tr>
            ))}
          </Table>
        </DetailSection>

        <DetailSection title="Auditoria tecnica reciente">
          <Table title="Auditoria tecnica reciente" itemLabel="registros" total={auditLogs.length} showPagination={false} headers={["Fecha", "Modulo", "Entidad", "Accion", "Usuario"]} empty={!auditLogs.length}>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <Td>{formatDateTime(log.createdAt)}</Td>
                <Td>{log.module}</Td>
                <Td>{log.entityType}</Td>
                <Td>{labelFromValue(log.action)}</Td>
                <Td>{log.createdBy?.name ?? "Sistema"}</Td>
              </tr>
            ))}
          </Table>
        </DetailSection>
      </div>
    </>
  );
}
