"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

const inputClass =
  "h-9 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]";

export function LoginForm() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action="/api/auth/session"
      method="post"
      className="space-y-4"
      onSubmit={() => setSubmitting(true)}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-[#495057]">Usuario</span>
        <input
          name="username"
          autoComplete="username"
          className={inputClass}
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
          className={inputClass}
          placeholder="seguridad123"
          required
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-[#0667b0] bg-[#0667b0] px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-[#0a61b9] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Spinner />
            Ingresando...
          </>
        ) : (
          "Ingresar"
        )}
      </button>
    </form>
  );
}
