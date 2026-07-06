import Image from "next/image";
import { LoginForm } from "./login-form";

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
            <p className="text-sm font-medium text-[#212529]">Acceso interno municipal</p>
          </div>
        </div>

        {hasError ? (
          <div className="mb-5 rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2.5 text-sm font-medium text-[#721c24]">
            Usuario o contrasena incorrectos.
          </div>
        ) : null}

        <LoginForm />

        {/* <div className="mt-6 rounded-xl bg-[#f3f8fb] p-3 text-xs leading-5 text-[#607589] ring-1 ring-[#d7e4ee]">
          Usuarios seed: <strong>despacho1</strong>, <strong>juridico1</strong>, <strong>directivo</strong>,{" "}
          <strong>secretario</strong>, <strong>admin</strong>. Contrasena: <strong>seguridad123</strong>.
        </div> */}
      </div>
    </main>
  );
}
