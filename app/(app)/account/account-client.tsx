"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { z } from "zod";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  squad?: string;
};

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  squad: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Obrigatório"),
    newPassword: z
      .string()
      .min(10, "Mínimo 10 caracteres")
      .regex(/[A-Z]/, "Precisa de maiúscula")
      .regex(/[a-z]/, "Precisa de minúscula")
      .regex(/[0-9]/, "Precisa de número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export default function AccountClient({ user }: { user: User }) {
  const [profileForm, setProfileForm] = useState({ name: user.name ?? "", squad: user.squad ?? "" });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileIsPending, startProfileTransition] = useTransition();

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwIsPending, startPwTransition] = useTransition();

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = profileSchema.safeParse(profileForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((i) => { errors[i.path[0] as string] = i.message; });
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    setProfileSuccess("");

    startProfileTransition(async () => {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", ...result.data }),
      });
      if (res.ok) setProfileSuccess("Perfil atualizado com sucesso.");
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = passwordSchema.safeParse(pwForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((i) => { errors[i.path[0] as string] = i.message; });
      setPwErrors(errors);
      return;
    }
    setPwErrors({});
    setPwError("");
    setPwSuccess("");

    startPwTransition(async () => {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", ...result.data }),
      });
      if (res.ok) {
        setPwSuccess("Senha alterada com sucesso.");
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        setPwError(data.error ?? "Erro ao alterar senha.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <section className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Informações do perfil</h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl">
            {(user.name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-neutral-900">{user.name}</p>
            <p className="text-sm text-neutral-500">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700">
              {user.role}
            </span>
          </div>
        </div>

        {profileSuccess && (
          <div className="mb-4 px-4 py-3 bg-success-50 text-success-700 rounded-lg text-sm">{profileSuccess}</div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nome</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                profileErrors.name ? "border-error-500" : "border-neutral-300"
              }`}
            />
            {profileErrors.name && <p className="mt-1.5 text-xs text-error-600">{profileErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Squad</label>
            <input
              type="text"
              value={profileForm.squad}
              onChange={(e) => setProfileForm((f) => ({ ...f, squad: e.target.value }))}
              placeholder="Ex: Growth, Core, Platform…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={profileIsPending}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:bg-brand-300 transition-colors"
          >
            {profileIsPending ? "Salvando…" : "Salvar perfil"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Alterar senha</h2>

        {pwError && (
          <div className="mb-4 px-4 py-3 bg-error-50 text-error-700 rounded-lg text-sm">{pwError}</div>
        )}
        {pwSuccess && (
          <div className="mb-4 px-4 py-3 bg-success-50 text-success-700 rounded-lg text-sm">{pwSuccess}</div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {field === "currentPassword" ? "Senha atual" : field === "newPassword" ? "Nova senha" : "Confirmar nova senha"}
              </label>
              <input
                type="password"
                value={pwForm[field]}
                onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  pwErrors[field] ? "border-error-500" : "border-neutral-300"
                }`}
              />
              {pwErrors[field] && <p className="mt-1.5 text-xs text-error-600">{pwErrors[field]}</p>}
            </div>
          ))}
          <button
            type="submit"
            disabled={pwIsPending}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:bg-brand-300 transition-colors"
          >
            {pwIsPending ? "Alterando…" : "Alterar senha"}
          </button>
        </form>
      </section>

      {/* Danger zone */}
      <section className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Sessão</h2>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-4 py-2 border border-error-300 text-error-700 rounded-lg text-sm font-semibold hover:bg-error-50 transition-colors"
        >
          Sair da conta
        </button>
      </section>
    </div>
  );
}
