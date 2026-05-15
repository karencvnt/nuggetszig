"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success message regardless of whether email exists
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Verifique seu e-mail</h2>
        <p className="text-neutral-500 mb-6">
          Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em
          breve.
        </p>
        <Link href="/login" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-neutral-900 mb-2">Esqueceu a senha?</h2>
      <p className="text-sm text-neutral-500 mb-6">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !email}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {isPending ? "Enviando…" : "Enviar link de redefinição"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
          Entrar
        </Link>
      </p>
    </>
  );
}
