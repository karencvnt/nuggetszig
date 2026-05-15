"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, BookOpen, Lock, Users, Globe, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { formatRelativeTime } from "@/lib/utils";

type Collection = {
  id: string;
  title: string;
  description: string | null;
  visibility: "PRIVATE" | "TEAM" | "COMPANY";
  createdAt: string | Date;
  createdBy: { id: string; name: string };
  _count: { nuggets: number };
};

const VISIBILITY_ICON = {
  PRIVATE: <Lock size={12} />,
  TEAM: <Users size={12} />,
  COMPANY: <Globe size={12} />,
};

const VISIBILITY_LABEL = { PRIVATE: "Privada", TEAM: "Time", COMPANY: "Empresa" };

interface Props {
  myCollections: Collection[];
  teamCollections: Collection[];
  userId: string;
  canCreate: boolean;
}

export default function CollectionsClient({ myCollections, teamCollections, userId, canCreate }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ title: string; description: string; context: string; visibility: "PRIVATE" | "TEAM" | "COMPANY" }>({ title: "", description: "", context: "", visibility: "TEAM" });

  const collections = tab === "mine" ? myCollections : teamCollections;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const col = await res.json();
      toast.success("Coleção criada com sucesso!");
      router.push(`/app/collections/${col.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar coleção.");
      setCreating(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Excluir esta coleção? Esta ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Coleção excluída.");
      router.refresh();
    } else {
      toast.error("Erro ao excluir coleção.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-neutral-900">Coleções</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} /> Nova coleção
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-200">
        {(["mine", "team"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t === "mine" ? "Minhas coleções" : "Coleções do time"}
          </button>
        ))}
      </div>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-neutral-300" />
          </div>
          <p className="text-base font-semibold text-neutral-700 mb-1">
            {tab === "mine" ? "Nenhuma coleção ainda" : "Nenhuma coleção do time"}
          </p>
          <p className="text-sm text-neutral-400">
            {tab === "mine" ? "Crie uma coleção para organizar seus nuggets." : "Coleções compartilhadas aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/app/collections/${col.id}`}
              className="relative group bg-white border border-neutral-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  {VISIBILITY_ICON[col.visibility]}
                  <span>{VISIBILITY_LABEL[col.visibility]}</span>
                </div>
                {col.createdBy.id === userId && (
                  <button
                    onClick={(e) => handleDelete(col.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-300 hover:text-error-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="font-semibold text-neutral-800 text-sm mb-1 line-clamp-2">{col.title}</p>
              {col.description && (
                <p className="text-xs text-neutral-400 line-clamp-2 mb-3">{col.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                <span className="text-xs text-neutral-400">{col._count.nuggets} nuggets</span>
                <span className="text-xs text-neutral-400">{formatRelativeTime(col.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Nova coleção</h2>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Título <span className="text-error-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Onboarding — insights Q1"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-400"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Contexto e objetivo desta coleção"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Visibilidade</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as "TEAM" | "PRIVATE" | "COMPANY" }))}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-400"
                >
                  <option value="PRIVATE">Privada (só eu)</option>
                  <option value="TEAM">Time (visível para o time)</option>
                  <option value="COMPANY">Empresa (todos)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 text-sm border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Criando..." : "Criar coleção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
