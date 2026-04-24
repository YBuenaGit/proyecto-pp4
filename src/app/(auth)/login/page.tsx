import { ShieldCheck } from "lucide-react";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const hasError = params.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-200 text-slate-700">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Secretaria de Seguridad</h1>
            <p className="text-sm text-slate-500">Acceso interno municipal</p>
          </div>
        </div>

        {hasError ? (
          <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Usuario o contrasena incorrectos.
          </div>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Usuario</span>
            <input
              name="username"
              autoComplete="username"
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="despacho1"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Contrasena</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="seguridad123"
              required
            />
          </label>
          <button className="h-11 w-full rounded-md bg-sky-700 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800">
            Ingresar
          </button>
        </form>

        <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Usuarios seed: <strong>despacho1</strong>, <strong>juridico1</strong>, <strong>directivo</strong>,{" "}
          <strong>secretario</strong>, <strong>admin</strong>. Contrasena: <strong>seguridad123</strong>.
        </div>
      </div>
    </main>
  );
}
