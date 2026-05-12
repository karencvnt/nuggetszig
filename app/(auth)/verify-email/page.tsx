"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const sent = searchParams.get("sent");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "idle"
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((res) => {
      setStatus(res.ok ? "success" : "error");
    });
  }, [token]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  function handleResend(email: string) {
    setResendError("");
    startTransition(async () => {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendCooldown(60);
      } else {
        const data = await res.json();
        setResendError(data.error ?? "Erro ao reenviar.");
      }
    });
  }

  if (status === "loading") {
    return <p className="text-center text-neutral-500">Verificando seu e-mail…</p>;
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">E-mail confirmado!</h2>
        <p className="text-neutral-500 mb-6">Sua conta está ativa. Faça login para começar.</p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-brand-600 text-white rounded-lg font-semibold text-sm hover:bg-brand-700 transition-colors"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Link inválido ou expirado</h2>
        <p className="text-neutral-500 mb-6">
          O link de verificação expirou ou já foi usado. Solicite um novo.
        </p>
        <ResendForm onResend={handleResend} cooldown={resendCooldown} isPending={isPending} error={resendError} />
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-4xl mb-4">📬</div>
      <h2 className="text-xl font-semibold text-neutral-900 mb-2">
        {sent ? "E-mail enviado!" : "Verifique seu e-mail"}
      </h2>
      <p className="text-neutral-500 mb-6">
        Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta.
      </p>
      <ResendForm onResend={handleResend} cooldown={resendCooldown} isPending={isPending} error={resendError} />
    </div>
  );
}

function ResendForm({
  onResend,
  cooldown,
  isPending,
  error,
}: {
  onResend: (email: string) => void;
  cooldown: number;
  isPending: boolean;
  error: string;
}) {
  const [email, setEmail] = useState("");

  return (
    <div className="mt-4">
      {error && <p className="text-sm text-error-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={() => onResend(email)}
          disabled={isPending || cooldown > 0 || !email}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:bg-brand-300 hover:bg-brand-700 transition-colors whitespace-nowrap"
        >
          {cooldown > 0 ? `Aguarde ${cooldown}s` : "Reenviar"}
        </button>
      </div>
    </div>
  );
}
