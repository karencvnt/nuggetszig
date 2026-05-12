"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";

type Segment = { id: string; name: string };
type Participant = {
  id: string; code: string;
  persona?: string | null; region?: string | null;
  segment?: { name: string } | null;
};

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function SourceDetailClient({
  sourceId, initialParticipants, segments, canEdit,
}: {
  sourceId: string;
  initialParticipants: Participant[];
  segments: Segment[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "new">("search");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [searching, startSearching] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [newForm, setNewForm] = useState({
    code: `P${String(participants.length + 1).padStart(3, "0")}`,
    segmentId: "", persona: "", usageProfile: "", timeAsClient: "", region: "", notes: "",
  });

  function handleSearch(q: string) {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    startSearching(async () => {
      const res = await fetch(`/api/participants?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setSearchResults(data.filter((p: Participant) => !participants.some((ep) => ep.id === p.id)));
    });
  }

  function linkParticipant(participantId: string) {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/sources/${sourceId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      if (res.ok) {
        router.refresh();
        setModalOpen(false);
        setSearchQ("");
        setSearchResults([]);
      } else {
        const d = await res.json();
        setError(d.error ?? "Erro ao vincular.");
      }
    });
  }

  function createAndLink() {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/sources/${sourceId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      if (res.ok) {
        router.refresh();
        setModalOpen(false);
      } else {
        const d = await res.json();
        setError(d.error ?? "Erro ao criar participante.");
      }
    });
  }

  function removeParticipant(participantId: string) {
    startTransition(async () => {
      await fetch(`/api/sources/${sourceId}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      setParticipants((p) => p.filter((x) => x.id !== participantId));
      router.refresh();
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-neutral-900">
          Participantes <span className="text-neutral-400 font-normal">({participants.length})</span>
        </h2>
        {canEdit && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <UserPlus size={15} /> Adicionar participante
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4">Nenhum participante vinculado a esta fonte.</p>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
                <th className="px-4 py-2.5 font-medium text-neutral-500">Código</th>
                <th className="px-4 py-2.5 font-medium text-neutral-500">Segmento</th>
                <th className="px-4 py-2.5 font-medium text-neutral-500">Persona</th>
                <th className="px-4 py-2.5 font-medium text-neutral-500">Região</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/app/participants/${p.id}`} className="font-mono text-xs font-medium text-brand-700 hover:text-brand-900">
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">{p.segment?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{p.persona ?? "—"}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{p.region ?? "—"}</td>
                  {canEdit && (
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => removeParticipant(p.id)}
                        className="p-1 text-neutral-300 hover:text-error-500 transition-colors"
                        title="Desvincular"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add participant modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setError(""); }} title="Adicionar participante">
        <div>
          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            {(["search", "new"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === m ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {m === "search" ? "Buscar existente" : "Criar novo"}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-error-600 mb-3">{error}</p>}

          {mode === "search" ? (
            <div>
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={searchQ}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Buscar por código, persona ou região…"
                  className={`${inputCls} pl-8`}
                />
              </div>
              {searching && <p className="text-sm text-neutral-400">Buscando…</p>}
              {searchResults.length > 0 && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => linkParticipant(p.id)}
                      disabled={isPending}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-0 transition-colors"
                    >
                      <div>
                        <p className="font-mono text-xs font-medium text-brand-700">{p.code}</p>
                        {p.persona && <p className="text-xs text-neutral-500">{p.persona}</p>}
                        {p.segment && <p className="text-xs text-neutral-400">{p.segment.name}</p>}
                      </div>
                      <span className="text-xs text-brand-600 font-medium">Vincular →</span>
                    </button>
                  ))}
                </div>
              )}
              {searchQ && !searching && searchResults.length === 0 && (
                <p className="text-sm text-neutral-400">Nenhum participante encontrado. <button onClick={() => setMode("new")} className="text-brand-600 hover:text-brand-700 font-medium">Criar novo?</button></p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Código *</label>
                <input value={newForm.code} onChange={(e) => setNewForm((f) => ({ ...f, code: e.target.value }))} className={`${inputCls} font-mono`} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Segmento</label>
                <select value={newForm.segmentId} onChange={(e) => setNewForm((f) => ({ ...f, segmentId: e.target.value }))} className={inputCls}>
                  <option value="">Sem segmento</option>
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {[
                { key: "persona", label: "Persona" },
                { key: "usageProfile", label: "Perfil de uso" },
                { key: "timeAsClient", label: "Tempo como cliente" },
                { key: "region", label: "Região" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">{label}</label>
                  <input
                    value={(newForm as Record<string, string>)[key]}
                    onChange={(e) => setNewForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Notas</label>
                <textarea value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </div>
              <button
                onClick={createAndLink}
                disabled={!newForm.code || isPending}
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:bg-brand-300 transition-colors"
              >
                {isPending ? "Criando…" : "Criar e vincular"}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
