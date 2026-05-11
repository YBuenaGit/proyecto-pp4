import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPeopleIndex, roleLabel } from "@/lib/people-index";
import { canAccessDispatch, canAccessJuridical, canAccessPeople } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const dniPattern = /^\d{7,8}$/;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ exists: false, error: "No autenticado." }, { status: 401 });
  if (!canAccessPeople(user)) return NextResponse.json({ exists: false, error: "Sin permisos." }, { status: 403 });

  const dni = (request.nextUrl.searchParams.get("dni") ?? "").replace(/\D/g, "").slice(0, 8);
  if (!dniPattern.test(dni)) return NextResponse.json({ exists: false, error: "DNI invalido." }, { status: 400 });

  const people = await getPeopleIndex({
    filters: { dni },
    permissions: {
      canDispatch: canAccessDispatch(user),
      canJuridical: canAccessJuridical(user),
    },
  });
  const person = people.find((entry) => entry.dni === dni);

  if (!person) return NextResponse.json({ exists: false });

  return NextResponse.json({
    exists: true,
    person: {
      id: person.id,
      href: `/personas/${person.id}`,
      displayName: person.displayName,
      dni: person.dni,
      firstName: person.firstName,
      lastName: person.lastName,
      phone1: person.phone1,
      phone2: person.phone2,
      address: person.address,
      roles: person.roles.filter((role) => role !== "REGISTRO").map(roleLabel),
      caseCount: person.caseCount,
      latestCase: person.latestCase
        ? {
            href: person.latestCase.href,
            internalNumber: person.latestCase.internalNumber,
            attendedAt: person.latestCase.attendedAt.toISOString(),
          }
        : null,
    },
  });
}
