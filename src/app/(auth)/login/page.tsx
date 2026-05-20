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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#d7e4ee] bg-[#fbfdff]/[0.96] p-8 shadow-[0_24px_70px_rgba(26,68,104,0.14)]">
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/logo-gum1.webp"
            alt="Logo Secretaria de Seguridad Ciudadana Yerba Buena"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-contain shadow-[0_12px_28px_rgba(23,63,99,0.18)]"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#172033]">Secretaria de Seguridad</h1>
            <p className="text-sm font-medium text-[#607589]">Acceso interno municipal</p>
          </div>
        </div>

        {hasError ? (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800">
            Usuario o contrasena incorrectos.
          </div>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#2f4c63]">Usuario</span>
            <input
              name="username"
              autoComplete="username"
              className="h-11 w-full rounded-lg border border-[#c9d9e5] bg-white/95 px-3 text-sm text-[#172033] outline-none transition duration-200 hover:border-[#9bb8ca] focus:border-[#255f85] focus:ring-[3px] focus:ring-[#c7dcea]"
              placeholder="despacho1"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#2f4c63]">Contrasena</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-11 w-full rounded-lg border border-[#c9d9e5] bg-white/95 px-3 text-sm text-[#172033] outline-none transition duration-200 hover:border-[#9bb8ca] focus:border-[#255f85] focus:ring-[3px] focus:ring-[#c7dcea]"
              placeholder="seguridad123"
              required
            />
          </label>
          <button className="h-11 w-full rounded-lg bg-[#173f63] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,63,99,0.20)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#225b80] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2]">
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
