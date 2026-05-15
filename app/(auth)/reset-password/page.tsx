"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

const schema = z
  .object({
    password: z
      .string()
      .min(10, "Mínimo de 10 caracteres")
      .regex(/[A-Z]/, "Precisa de ao menos uma letra maiúscula")
      .regex(/[a-z]/, "Precisa de ao menos uma letra minúscula")
      .regex(/[0-9]/, "Precisa de ao menos um número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: "Fraca", color: "bg-error-500" };
  if (score <= 3) return { score, label: "Média", color: "bg-warning-500" };
  return { score, label: "Forte", color: "bg-success-500" };
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const strength = getStrength(form.password);

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-neutral-500 mb-4">Link inválido. Solicite um novo link de redefinição.</p>
        <Link href="/forgot-password" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  function validate() {
    const result = schema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((i) => { errors[i.path[0] as string] = i.message; });
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError("");

    startTransition(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        const data = await res.json();
        setError(data.error ?? "Link inválido ou expirado.");
      }
    });
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Senha redefinida!</h2>
        <p className="text-neutral-500">Redirecionando para o login…</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-neutral-900 mb-6">Nova senha</h2>

      {error && (
        <div className="mb-4 px-4 py-3 bg-error-50 text-error-700 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nova senha</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onBlur={validate}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
              fieldErrors.password ? "border-error-500" : "border-neutral-300"
            }`}
          />
          {form.password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= strength.score ? strength.color : "bg-neutral-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-500">Força: <span className="font-medium">{strength.label}</span></p>
            </div>
          )}
          {fieldErrors.password && <p className="mt-1.5 text-xs text-error-600">{fieldErrors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Confirmar nova senha</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            onBlur={validate}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
              fieldErrors.confirmPassword ? "border-error-500" : "border-neutral-300"
            }`}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1.5 text-xs text-error-600">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {isPending ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </>
  );
}
