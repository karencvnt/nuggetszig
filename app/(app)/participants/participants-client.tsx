"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Segment = { id: string; name: string };
type Participant = {
  id: string; code: string;
  persona?: string | null; region?: string | null;
  segment?: { name: string } | null;
  _count: { sources: number; nuggets: number };
};

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function ParticipantsClient({
  initialParticipants, segments, canCreate,
}: {
  initialParticipants: Participant[];
  segments: Segment[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    code: `P${String(initialParticipants.length + 1).padStart(3, "0")}`,
    segmentId: "", persona: "", usageProfile: "", timeAsClient: "", region: "", notes: "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState("");

  const filtered = initialParticipants.filter(
    (p) =>
      !q ||
      p.code.toLowerCase().includes(q.toLowerCase()) ||
      (p.persona ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (p.region ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (p.segment?.name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const p = await res.json();
        setModalOpen(false);
        router.push(`/app/participants/${p.id}`);
      } else {
        const d = await res.json();
        setError(d.error ?? "Erro ao criar participante.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código, persona ou região…"
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {canCreate && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> Novo participante
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-neutral-400">Nenhum participante encontrado.</p>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
                <th className="px-4 py-3 font-medium text-neutral-500">Código</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Segmento</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Persona</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Região</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-right">Fontes</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-right">Nuggets</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/app/participants/${p.id}`} className="font-mono text-xs font-bold text-brand-700 hover:text-brand-900">
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{p.segment?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{p.persona ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{p.region ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-neutral-600">{p._count.sources}</td>
                  <td className="px-4 py-3 text-right text-neutral-600">{p._count.nuggets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo participante">
        <form onSubmit={handleCreate} className="space-y-3">
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Código *</label>
            <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className={`${inputCls} font-mono`} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Segmento</label>
            <select value={form.segmentId} onChange={(e) => setForm((f) => ({ ...f, segmentId: e.target.value }))} className={inputCls}>
              <option value="">Sem segmento</option>
              {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {([["persona", "Persona"], ["usageProfile", "Perfil de uso"], ["timeAsClient", "Tempo como cliente"], ["region", "Região"]] as [string, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-neutral-700 mb-1">{label}</label>
              <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={inputCls} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Notas internas</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 rounded-lg">
              {isPending ? "Criando…" : "Criar participante"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
