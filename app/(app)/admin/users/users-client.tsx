"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatRelativeTime } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  squad: string | null;
  createdAt: Date;
};

type Role = "VIEWER" | "CONTRIBUTOR" | "ADMIN";

const ROLE_LABELS: Record<string, string> = {
  VIEWER: "Viewer",
  CONTRIBUTOR: "Contributor",
  ADMIN: "Admin",
};

const ROLE_VARIANTS: Record<string, "default" | "success" | "warning"> = {
  VIEWER: "neutral" as "default",
  CONTRIBUTOR: "default",
  ADMIN: "warning",
};

export default function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "VIEWER" as Role });
  const [inviteError, setInviteError] = useState("");
  const [invitePending, startInviteTransition] = useTransition();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function updateUser(id: string, data: { role?: Role; isActive?: boolean }) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refresh();
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    startInviteTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        setInviteOpen(false);
        setInviteForm({ email: "", role: "VIEWER" });
        refresh();
      } else {
        const d = await res.json();
        setInviteError(d.error ?? "Erro ao convidar.");
      }
    });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
        >
          <UserPlus size={16} />
          Convidar usuário
        </button>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Papel</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Último acesso</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((user) => (
              <tr key={user.id} className={`border-b border-neutral-100 last:border-0 ${!user.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">{user.name}</p>
                      {user.squad && <p className="text-xs text-neutral-400">{user.squad}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-500">{user.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => updateUser(user.id, { role: e.target.value as Role })}
                    className="text-xs border border-neutral-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {(["VIEWER", "CONTRIBUTOR", "ADMIN"] as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? "success" : "neutral"}>
                    {user.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-neutral-400 text-xs">
                  {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Nunca"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                    title={user.isActive ? "Desativar conta" : "Reativar conta"}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.isActive
                        ? "text-neutral-400 hover:text-error-600 hover:bg-error-50"
                        : "text-neutral-400 hover:text-success-600 hover:bg-success-50"
                    }`}
                  >
                    <Power size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Convidar usuário">
        <form onSubmit={handleInvite} className="space-y-4">
          {inviteError && <p className="text-sm text-error-600">{inviteError}</p>}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">E-mail</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="colega@empresa.com"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Papel</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="VIEWER">Viewer — somente leitura</option>
              <option value="CONTRIBUTOR">Contributor — pode criar nuggets</option>
              <option value="ADMIN">Admin — acesso total</option>
            </select>
          </div>
          <p className="text-xs text-neutral-400">
            Um e-mail de convite será enviado com um link válido por 7 dias.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={invitePending} className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 rounded-lg">
              {invitePending ? "Enviando…" : "Enviar convite"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
