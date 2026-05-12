"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EntityTable, AddButton, type EntityRow } from "@/components/admin/entity-table";
import { Modal } from "@/components/ui/modal";
import { ColorPicker } from "@/components/admin/color-picker";
import { IconPicker } from "@/components/admin/icon-picker";

// ─── Types ────────────────────────────────────────────────────────────────────

type NuggetType = EntityRow & { icon: string; color: string; description?: string | null };
type Tag = EntityRow & { color: string; category: string; description?: string | null };
type Journey = EntityRow & { color?: string | null; description?: string | null; stages: string[] };
type Method = EntityRow & { category: string; description?: string | null };
type Segment = EntityRow & { description?: string | null };

interface InitialData {
  nuggetTypes: (NuggetType & { _count: number })[];
  tags: (Tag & { _count: number })[];
  journeys: (Journey & { _count: number })[];
  methods: (Method & { _count: number })[];
  segments: (Segment & { _count: number })[];
}

type Tab = "nugget-types" | "tags" | "journeys" | "methods" | "segments";

const TABS: { id: Tab; label: string }[] = [
  { id: "nugget-types", label: "Tipos de Nugget" },
  { id: "tags", label: "Tags" },
  { id: "journeys", label: "Jornadas" },
  { id: "methods", label: "Métodos" },
  { id: "segments", label: "Segmentos" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaxonomyClient({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("nugget-types");
  const [isPending, startTransition] = useTransition();

  const [editingNuggetType, setEditingNuggetType] = useState<NuggetType | null>(null);
  const [addingNuggetType, setAddingNuggetType] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [addingTag, setAddingTag] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [addingJourney, setAddingJourney] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [addingMethod, setAddingMethod] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [addingSegment, setAddingSegment] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function toggleActive(endpoint: string, row: EntityRow) {
    await fetch(`/api/admin/${endpoint}/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    refresh();
  }

  async function reorder(endpoint: string, ids: string[]) {
    await fetch(`/api/admin/${endpoint}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }

  const nuggetTypeRows: EntityRow[] = initialData.nuggetTypes;
  const tagRows: EntityRow[] = initialData.tags;
  const journeyRows: EntityRow[] = initialData.journeys;
  const methodRows: EntityRow[] = initialData.methods;
  const segmentRows: EntityRow[] = initialData.segments;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
              tab === t.id
                ? "bg-white border border-neutral-200 border-b-white text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "nugget-types" && (
        <Section
          title="Tipos de Nugget"
          action={<AddButton onClick={() => setAddingNuggetType(true)} label="Novo tipo" />}
        >
          <EntityTable
            rows={nuggetTypeRows}
            onEdit={(r) => setEditingNuggetType(initialData.nuggetTypes.find((t) => t.id === r.id)!)}
            onToggleActive={(r) => toggleActive("nugget-types", r)}
            onReorder={(ids) => reorder("nugget-types", ids)}
            showColor
            showIcon
            linkedLabel="nuggets"
          />
        </Section>
      )}

      {tab === "tags" && (
        <Section title="Tags" action={<AddButton onClick={() => setAddingTag(true)} label="Nova tag" />}>
          <EntityTable
            rows={tagRows}
            onEdit={(r) => setEditingTag(initialData.tags.find((t) => t.id === r.id)!)}
            onToggleActive={(r) => toggleActive("tags", r)}
            showColor
            showCategory
            linkedLabel="nuggets"
          />
        </Section>
      )}

      {tab === "journeys" && (
        <Section title="Jornadas" action={<AddButton onClick={() => setAddingJourney(true)} label="Nova jornada" />}>
          <EntityTable
            rows={journeyRows}
            onEdit={(r) => setEditingJourney(initialData.journeys.find((j) => j.id === r.id)!)}
            onToggleActive={(r) => toggleActive("journeys", r)}
            onReorder={(ids) => reorder("journeys", ids)}
            showColor
            linkedLabel="nuggets"
          />
        </Section>
      )}

      {tab === "methods" && (
        <Section title="Métodos de pesquisa" action={<AddButton onClick={() => setAddingMethod(true)} label="Novo método" />}>
          <EntityTable
            rows={methodRows}
            onEdit={(r) => setEditingMethod(initialData.methods.find((m) => m.id === r.id)!)}
            onToggleActive={(r) => toggleActive("methods", r)}
            showCategory
            linkedLabel="fontes"
          />
        </Section>
      )}

      {tab === "segments" && (
        <Section title="Segmentos" action={<AddButton onClick={() => setAddingSegment(true)} label="Novo segmento" />}>
          <EntityTable
            rows={segmentRows}
            onEdit={(r) => setEditingSegment(initialData.segments.find((s) => s.id === r.id)!)}
            onToggleActive={(r) => toggleActive("segments", r)}
            linkedLabel="participantes"
          />
        </Section>
      )}

      {/* Modals */}
      <NuggetTypeModal
        open={addingNuggetType || !!editingNuggetType}
        initial={editingNuggetType ?? undefined}
        onClose={() => { setAddingNuggetType(false); setEditingNuggetType(null); }}
        onSaved={refresh}
      />
      <TagModal
        open={addingTag || !!editingTag}
        initial={editingTag ?? undefined}
        onClose={() => { setAddingTag(false); setEditingTag(null); }}
        onSaved={refresh}
      />
      <JourneyModal
        open={addingJourney || !!editingJourney}
        initial={editingJourney ?? undefined}
        onClose={() => { setAddingJourney(false); setEditingJourney(null); }}
        onSaved={refresh}
      />
      <MethodModal
        open={addingMethod || !!editingMethod}
        initial={editingMethod ?? undefined}
        onClose={() => { setAddingMethod(false); setEditingMethod(null); }}
        onSaved={refresh}
      />
      <SegmentModal
        open={addingSegment || !!editingSegment}
        initial={editingSegment ?? undefined}
        onClose={() => { setAddingSegment(false); setEditingSegment(null); }}
        onSaved={refresh}
      />
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Entity modals ────────────────────────────────────────────────────────────

function NuggetTypeModal({
  open, initial, onClose, onSaved,
}: { open: boolean; initial?: NuggetType; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", color: initial?.color ?? "#6172f3", icon: initial?.icon ?? "lightbulb", description: initial?.description ?? "" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initial;
  const endpoint = isEdit ? `/api/admin/nugget-types/${initial!.id}` : "/api/admin/nugget-types";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json(); setError(d.error ?? "Erro ao salvar."); }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar tipo" : "Novo tipo de nugget"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-error-600">{error}</p>}
        <Field label="Nome">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} required />
        </Field>
        <Field label="Cor">
          <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
        </Field>
        <Field label="Ícone">
          <IconPicker value={form.icon} onChange={(i) => setForm((f) => ({ ...f, icon: i }))} />
        </Field>
        <Field label="Descrição (opcional)">
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
        </Field>
        <ModalActions onClose={onClose} isPending={isPending} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

function TagModal({
  open, initial, onClose, onSaved,
}: { open: boolean; initial?: Tag; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", category: initial?.category ?? "", color: initial?.color ?? "#6172f3", description: initial?.description ?? "" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initial;
  const endpoint = isEdit ? `/api/admin/tags/${initial!.id}` : "/api/admin/tags";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json(); setError(d.error ?? "Erro ao salvar."); }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar tag" : "Nova tag"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-error-600">{error}</p>}
        <Field label="Nome"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} required /></Field>
        <Field label="Categoria"><input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ex: Produto, Jornada…" className={inputCls} required /></Field>
        <Field label="Cor"><ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} /></Field>
        <Field label="Descrição (opcional)"><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} /></Field>
        <ModalActions onClose={onClose} isPending={isPending} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

function JourneyModal({
  open, initial, onClose, onSaved,
}: { open: boolean; initial?: Journey; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    color: initial?.color ?? "#6172f3",
    description: initial?.description ?? "",
    stages: initial?.stages ?? [""],
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initial;
  const endpoint = isEdit ? `/api/admin/journeys/${initial!.id}` : "/api/admin/journeys";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const stages = form.stages.filter((s) => s.trim());
    if (!stages.length) { setError("Pelo menos uma etapa é obrigatória."); return; }
    startTransition(async () => {
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stages }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json(); setError(d.error ?? "Erro ao salvar."); }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar jornada" : "Nova jornada"} className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-error-600">{error}</p>}
        <Field label="Nome"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} required /></Field>
        <Field label="Cor"><ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} /></Field>
        <Field label="Descrição (opcional)"><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} /></Field>
        <Field label="Etapas">
          <div className="space-y-2">
            {form.stages.map((stage, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={stage}
                  onChange={(e) => {
                    const stages = [...form.stages];
                    stages[i] = e.target.value;
                    setForm((f) => ({ ...f, stages }));
                  }}
                  placeholder={`Etapa ${i + 1}`}
                  className={`${inputCls} flex-1`}
                />
                <button type="button" onClick={() => setForm((f) => ({ ...f, stages: f.stages.filter((_, j) => j !== i) }))} className="px-2 text-neutral-400 hover:text-error-600">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setForm((f) => ({ ...f, stages: [...f.stages, ""] }))} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Adicionar etapa</button>
          </div>
        </Field>
        <ModalActions onClose={onClose} isPending={isPending} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

function MethodModal({
  open, initial, onClose, onSaved,
}: { open: boolean; initial?: Method; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", category: (initial?.category ?? "qualitativo") as "qualitativo" | "quantitativo" | "desk research", description: initial?.description ?? "" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initial;
  const endpoint = isEdit ? `/api/admin/methods/${initial!.id}` : "/api/admin/methods";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json(); setError(d.error ?? "Erro ao salvar."); }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar método" : "Novo método"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-error-600">{error}</p>}
        <Field label="Nome"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} required /></Field>
        <Field label="Categoria">
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof form.category }))} className={inputCls}>
            <option value="qualitativo">Qualitativo</option>
            <option value="quantitativo">Quantitativo</option>
            <option value="desk research">Desk Research</option>
          </select>
        </Field>
        <Field label="Descrição (opcional)"><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} /></Field>
        <ModalActions onClose={onClose} isPending={isPending} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

function SegmentModal({
  open, initial, onClose, onSaved,
}: { open: boolean; initial?: Segment; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", description: initial?.description ?? "" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initial;
  const endpoint = isEdit ? `/api/admin/segments/${initial!.id}` : "/api/admin/segments";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json(); setError(d.error ?? "Erro ao salvar."); }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar segmento" : "Novo segmento"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-error-600">{error}</p>}
        <Field label="Nome"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} required /></Field>
        <Field label="Descrição (opcional)"><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} /></Field>
        <ModalActions onClose={onClose} isPending={isPending} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onClose, isPending, isEdit }: { onClose: () => void; isPending: boolean; isEdit: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 rounded-lg transition-colors">
        {isPending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar"}
      </button>
    </div>
  );
}
