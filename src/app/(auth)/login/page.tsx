import Image from "next/image";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const hasError = params.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-sm border border-[#dee2e6] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b border-[#dee2e6] pb-4">
          <Image
            src="/logo-gum1.webp"
            alt="Logo Secretaria de Seguridad Ciudadana Yerba Buena"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-sm object-contain"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-[#212529]">Secretaria de Seguridad</h1>
            <p className="text-sm font-medium text-[#6c757d]">Acceso interno municipal</p>
          </div>
        </div>

        {hasError ? (
          <div className="mb-5 rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2.5 text-sm font-medium text-[#721c24]">
            Usuario o contrasena incorrectos.
          </div>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#495057]">Usuario</span>
            <input
              name="username"
              autoComplete="username"
              className="h-9 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]"
              placeholder="despacho1"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#495057]">Contrasena</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-9 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]"
              placeholder="seguridad123"
              required
            />
          </label>
          <button className="h-9 w-full rounded-sm border border-[#0667b0] bg-[#0667b0] px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-[#0a61b9] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]">
            Ingresar
          </button>
        </form>

        {/* <div className="mt-6 rounded-xl bg-[#f3f8fb] p-3 text-xs leading-5 text-[#607589] ring-1 ring-[#d7e4ee]">
          Usuarios seed: <strong>despacho1</strong>, <strong>juridico1</strong>, <strong>directivo</strong>,{" "}
          <strong>secretario</strong>, <strong>admin</strong>. Contrasena: <strong>seguridad123</strong>.
        </div> */}
      </div>
    </main>
  );
}
