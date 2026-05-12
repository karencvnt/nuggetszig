"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Segment = { id: string; name: string };
type Participant = {
  id: string; code: string;
  segmentId?: string | null; persona?: string | null;
  usageProfile?: string | null; timeAsClient?: string | null;
  region?: string | null; notes?: string | null;
};

const inputCls = "w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function ParticipantEditClient({ participant, segments }: { participant: Participant; segments: Segment[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: participant.code,
    segmentId: participant.segmentId ?? "",
    persona: participant.persona ?? "",
    usageProfile: participant.usageProfile ?? "",
    timeAsClient: participant.timeAsClient ?? "",
    region: participant.region ?? "",
    notes: participant.notes ?? "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/participants/${participant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, segmentId: form.segmentId || null }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <Pencil size={12} /> Editar perfil
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar participante">
        <form onSubmit={handleSave} className="space-y-3">
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
            <label className="block text-xs font-medium text-neutral-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 rounded-lg">
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
