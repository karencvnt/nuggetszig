"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, X, Link2 } from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { calculateCompletenessScore, getCompletenessLabel, formatDate, formatRelativeTime } from "@/lib/utils";

type NuggetType = { id: string; name: string; color: string; icon: string };
type Tag = { id: string; name: string; color: string; category: string };
type Source = { id: string; title: string };
type JourneyRef = { id: string; name: string; stages: unknown };
type Participant = { id: string; code: string };
type RelatedNugget = {
  id: string;
  content: string;
  type: { name: string; color: string };
  status: string;
};

type FullNugget = {
  id: string;
  content: string;
  typeId: string;
  type: NuggetType;
  sourceId: string;
  source: {
    id: string;
    title: string;
    participants: { participant: Participant }[];
  };
  participantId: string | null;
  participant: Participant | null;
  journeyId: string | null;
  journey: JourneyRef | null;
  journeyStage: string | null;
  sentiment: string | null;
  impact: string | null;
  status: string;
  evidenceUrl: string | null;
  notes: string | null;
  completenessScore: number;
  tags: { tag: Tag }[];
  createdBy: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  relationsFrom: { fromNuggetId: string; toNuggetId: string; relationType: string; toNugget: RelatedNugget }[];
  relationsTo: { fromNuggetId: string; toNuggetId: string; relationType: string; fromNugget: RelatedNugget }[];
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors";

const STATUS_OPTIONS = [
  { value: "NEW", label: "Novo" },
  { value: "VALIDATED", label: "Validado" },
  { value: "INVESTIGATING", label: "Investigando" },
  { value: "DISCARDED", label: "Descartado" },
  { value: "ADDRESSED", label: "Tratado" },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-neutral-100 text-neutral-600",
  VALIDATED: "bg-success-50 text-success-700",
  INVESTIGATING: "bg-warning-50 text-warning-700",
  DISCARDED: "bg-neutral-100 text-neutral-400",
  ADDRESSED: "bg-brand-50 text-brand-700",
};

const RELATION_LABELS: Record<string, string> = {
  COMPLEMENTS: "Complementa",
  CONTRADICTS: "Contradiz",
  DEEPENS: "Aprofunda",
};

const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVE: "Positivo",
  NEUTRAL: "Neutro",
  NEGATIVE: "Negativo",
};

const IMPACT_LABELS: Record<string, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

export default function NuggetDetailClient({
  nugget,
  nuggetTypes,
  journeys,
  allTags,
  sources,
  canEdit,
}: {
  nugget: FullNugget;
  nuggetTypes: NuggetType[];
  journeys: JourneyRef[];
  allTags: Tag[];
  sources: Source[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(nugget);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [relationOpen, setRelationOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Edit form state
  const [editForm, setEditForm] = useState({
    content: nugget.content,
    typeId: nugget.typeId,
    sourceId: nugget.sourceId,
    participantId: nugget.participantId ?? "",
    journeyId: nugget.journeyId ?? "",
    journeyStage: nugget.journeyStage ?? "",
    sentiment: (nugget.sentiment ?? "") as "" | "POSITIVE" | "NEUTRAL" | "NEGATIVE",
    impact: (nugget.impact ?? "") as "" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    evidenceUrl: nugget.evidenceUrl ?? "",
    notes: nugget.notes ?? "",
    tagIds: nugget.tags.map((t) => t.tag.id),
  });
  const [editSourceParticipants, setEditSourceParticipants] = useState<Participant[]>(
    nugget.source.participants.map((sp) => sp.participant)
  );
  const [editTagSearch, setEditTagSearch] = useState("");
  const [editTags, setEditTags] = useState<Tag[]>(allTags);
  const [creatingTag, setCreatingTag] = useState(false);

  // Relation form
  const [relSearch, setRelSearch] = useState("");
  const [relResults, setRelResults] = useState<RelatedNugget[]>([]);
  const [relType, setRelType] = useState<"COMPLEMENTS" | "CONTRADICTS" | "DEEPENS">("COMPLEMENTS");
  const [searching, startSearching] = useTransition();

  const allRelated = [
    ...data.relationsFrom.map((r) => ({ ...r.toNugget, relationType: r.relationType, otherNuggetId: r.toNuggetId })),
    ...data.relationsTo.map((r) => ({ ...r.fromNugget, relationType: r.relationType, otherNuggetId: r.fromNuggetId })),
  ];

  useEffect(() => {
    if (!editForm.sourceId) {
      setEditSourceParticipants([]);
      return;
    }
    fetch(`/api/sources/${editForm.sourceId}`)
      .then((r) => r.json())
      .then((d) => {
        setEditSourceParticipants((d.participants ?? []).map((sp: { participant: Participant }) => sp.participant));
      })
      .catch(() => setEditSourceParticipants([]));
  }, [editForm.sourceId]);

  function setEF<K extends keyof typeof editForm>(field: K, value: (typeof editForm)[K]) {
    setEditForm((f) => ({ ...f, [field]: value }));
  }

  function toggleEditTag(id: string) {
    setEditForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));
  }

  async function handleCreateEditTag() {
    const name = editTagSearch.trim();
    if (!name) return;
    setCreatingTag(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const tag: Tag = await res.json();
        setEditTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
        setEditForm((f) => ({ ...f, tagIds: [...f.tagIds, tag.id] }));
        setEditTagSearch("");
      }
    } finally {
      setCreatingTag(false);
    }
  }

  const editSelectedJourney = journeys.find((j) => j.id === editForm.journeyId);
  const editJourneyStages: string[] = editSelectedJourney ? (editSelectedJourney.stages as string[]) : [];
  const editFilteredTags = editTags.filter(
    (t) => !editTagSearch || t.name.toLowerCase().includes(editTagSearch.toLowerCase())
  );
  const editHasExactMatch = editTags.some(
    (t) => t.name.toLowerCase() === editTagSearch.toLowerCase()
  );

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const res = await fetch(`/api/nuggets/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
      }
    });
  }

  function handleSaveEdit() {
    if (!editForm.content.trim()) { setError("Conteúdo obrigatório."); return; }
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/nuggets/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editForm.content,
          typeId: editForm.typeId,
          sourceId: editForm.sourceId,
          participantId: editForm.participantId || null,
          journeyId: editForm.journeyId || null,
          journeyStage: editForm.journeyStage || null,
          sentiment: editForm.sentiment || null,
          impact: editForm.impact || null,
          evidenceUrl: editForm.evidenceUrl || null,
          notes: editForm.notes || null,
          tagIds: editForm.tagIds,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        setEditOpen(false);
      } else {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/nuggets/${data.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/app/nuggets");
      } else {
        const d = await res.json();
        setError(d.error ?? "Erro ao excluir.");
        setDeleteConfirm(false);
      }
    });
  }

  function handleRelSearch(q: string) {
    setRelSearch(q);
    if (!q.trim()) { setRelResults([]); return; }
    startSearching(async () => {
      const res = await fetch(`/api/nuggets?q=${encodeURIComponent(q)}`);
      const items = await res.json();
      const relatedIds = new Set([data.id, ...allRelated.map((r) => r.id)]);
      setRelResults(
        items
          .filter((n: { id: string; content: string; type: { name: string; color: string }; status: string }) => !relatedIds.has(n.id))
          .slice(0, 8)
      );
    });
  }

  function handleAddRelation(toNuggetId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/nuggets/${data.id}/relations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNuggetId, relationType: relType }),
      });
      if (res.ok) {
        router.refresh();
        setRelationOpen(false);
        setRelSearch("");
        setRelResults([]);
      } else {
        const d = await res.json();
        setError(d.error ?? "Erro ao criar relação.");
      }
    });
  }

  function handleDeleteRelation(otherNuggetId: string) {
    startTransition(async () => {
      await fetch(`/api/nuggets/${data.id}/relations/${otherNuggetId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  const score = data.completenessScore;
  const scoreBarColor = score <= 40 ? "bg-error-500" : score <= 70 ? "bg-warning-500" : "bg-success-500";

  return (
    <div className="grid grid-cols-3 gap-8">
      {/* Main content — 2/3 */}
      <div className="col-span-2 space-y-6">
        {/* Content card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: data.type.color }}
              />
              <span className="text-sm font-medium text-neutral-500">{data.type.name}</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditForm({
                      content: data.content,
                      typeId: data.typeId,
                      sourceId: data.sourceId,
                      participantId: data.participantId ?? "",
                      journeyId: data.journeyId ?? "",
                      journeyStage: data.journeyStage ?? "",
                      sentiment: (data.sentiment ?? "") as typeof editForm.sentiment,
                      impact: (data.impact ?? "") as typeof editForm.impact,
                      evidenceUrl: data.evidenceUrl ?? "",
                      notes: data.notes ?? "",
                      tagIds: data.tags.map((t) => t.tag.id),
                    });
                    setError("");
                    setEditOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-error-600 transition-colors"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            )}
          </div>

          <p className="text-neutral-900 text-base leading-relaxed whitespace-pre-wrap">{data.content}</p>

          {/* Tags */}
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-neutral-100">
              {data.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700">Metadados</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetaItem label="Fonte">
              <Link href={`/app/sources/${data.source.id}`} className="text-brand-600 hover:underline text-sm">
                {data.source.title}
              </Link>
            </MetaItem>
            {data.participant && (
              <MetaItem label="Participante">
                <Link href={`/app/participants/${data.participant.id}`} className="text-brand-600 hover:underline font-mono text-sm">
                  {data.participant.code}
                </Link>
              </MetaItem>
            )}
            {data.journey && (
              <MetaItem label="Jornada">
                <span className="text-sm text-neutral-700">{data.journey.name}</span>
                {data.journeyStage && (
                  <span className="text-xs text-neutral-400 ml-1">→ {data.journeyStage}</span>
                )}
              </MetaItem>
            )}
            {data.sentiment && (
              <MetaItem label="Sentimento">
                <span className="text-sm text-neutral-700">{SENTIMENT_LABELS[data.sentiment] ?? data.sentiment}</span>
              </MetaItem>
            )}
            {data.impact && (
              <MetaItem label="Impacto">
                <span className="text-sm text-neutral-700">{IMPACT_LABELS[data.impact] ?? data.impact}</span>
              </MetaItem>
            )}
            {data.evidenceUrl && (
              <MetaItem label="Evidência">
                <a
                  href={data.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline text-sm flex items-center gap-1"
                >
                  <Link2 size={12} /> Ver link
                </a>
              </MetaItem>
            )}
            {data.notes && (
              <MetaItem label="Notas" className="col-span-2">
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{data.notes}</p>
              </MetaItem>
            )}
          </div>
        </div>

        {/* Relations */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">
              Nuggets relacionados{" "}
              <span className="text-neutral-400 font-normal">({allRelated.length})</span>
            </h3>
            {canEdit && (
              <button
                onClick={() => setRelationOpen(true)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition-colors"
              >
                <Plus size={12} /> Adicionar
              </button>
            )}
          </div>
          {allRelated.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum nugget relacionado ainda.</p>
          ) : (
            <div className="space-y-2">
              {allRelated.map((rel) => (
                <div
                  key={rel.otherNuggetId}
                  className="flex items-start gap-3 p-3 border border-neutral-100 rounded-lg"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: rel.type.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-neutral-400 font-medium">
                        {RELATION_LABELS[rel.relationType] ?? rel.relationType}
                      </span>
                    </div>
                    <Link
                      href={`/app/nuggets/${rel.id}`}
                      className="text-sm text-neutral-700 hover:text-brand-700 line-clamp-2"
                    >
                      {rel.content}
                    </Link>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteRelation(rel.otherNuggetId)}
                      className="text-neutral-300 hover:text-error-500 flex-shrink-0 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar — 1/3 */}
      <aside className="col-span-1 space-y-4">
        {/* Status */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <label className="block text-xs font-medium text-neutral-500 mb-2">Status</label>
          {canEdit ? (
            <select
              value={data.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[data.status] ?? "bg-neutral-100 text-neutral-500"}`}
            >
              {STATUS_OPTIONS.find((o) => o.value === data.status)?.label ?? data.status}
            </span>
          )}
        </div>

        {/* Completeness */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-500">Completude</span>
            <span className="text-xs font-semibold text-neutral-700">
              {score}% — {getCompletenessLabel(score)}
            </span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${scoreBarColor} transition-all`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Info */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs text-neutral-400">Criado por</p>
            <p className="text-sm text-neutral-700 mt-0.5">{data.createdBy.name}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Criado em</p>
            <p className="text-sm text-neutral-700 mt-0.5">{formatDate(data.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Atualizado</p>
            <p className="text-sm text-neutral-700 mt-0.5">{formatRelativeTime(data.updatedAt)}</p>
          </div>
        </div>
      </aside>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar nugget">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {error && <p className="text-sm text-error-600">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Conteúdo *</label>
            <div className="relative">
              <textarea
                value={editForm.content}
                onChange={(e) => setEF("content", e.target.value.slice(0, 500))}
                rows={4}
                className={`${inputCls} resize-none text-sm`}
              />
              <span className="absolute bottom-2 right-3 text-xs text-neutral-400">
                {editForm.content.length}/500
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Tipo</label>
              <select value={editForm.typeId} onChange={(e) => setEF("typeId", e.target.value)} className={inputCls}>
                {nuggetTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Fonte</label>
              <select value={editForm.sourceId} onChange={(e) => setEF("sourceId", e.target.value)} className={inputCls}>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>

          {editSourceParticipants.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Participante</label>
              <select value={editForm.participantId} onChange={(e) => setEF("participantId", e.target.value)} className={inputCls}>
                <option value="">Nenhum</option>
                {editSourceParticipants.map((p) => (
                  <option key={p.id} value={p.id}>{p.code}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Jornada</label>
              <select
                value={editForm.journeyId}
                onChange={(e) => { setEF("journeyId", e.target.value); setEF("journeyStage", ""); }}
                className={inputCls}
              >
                <option value="">Sem jornada</option>
                {journeys.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
            {editForm.journeyId && editJourneyStages.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Etapa</label>
                <select value={editForm.journeyStage} onChange={(e) => setEF("journeyStage", e.target.value)} className={inputCls}>
                  <option value="">Sem etapa</option>
                  {editJourneyStages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Sentimento</label>
            <div className="flex gap-2">
              {(["POSITIVE", "NEUTRAL", "NEGATIVE"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEF("sentiment", editForm.sentiment === val ? "" : val)}
                  className={`flex-1 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                    editForm.sentiment === val
                      ? val === "POSITIVE" ? "border-success-400 text-success-700 bg-success-50"
                        : val === "NEGATIVE" ? "border-error-400 text-error-700 bg-error-50"
                        : "border-neutral-400 text-neutral-700 bg-neutral-100"
                      : "text-neutral-400 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  {SENTIMENT_LABELS[val]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Impacto</label>
            <div className="flex gap-2">
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEF("impact", editForm.impact === val ? "" : val)}
                  className={`flex-1 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                    editForm.impact === val
                      ? "bg-brand-600 text-white border-brand-600"
                      : "text-neutral-500 border-neutral-200 hover:border-brand-300"
                  }`}
                >
                  {IMPACT_LABELS[val]}
                </button>
              ))}
            </div>
          </div>

          {/* Tags in edit */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Tags</label>
            {editForm.tagIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {editForm.tagIds.map((id) => {
                  const tag = editTags.find((t) => t.id === id);
                  if (!tag) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                      <button type="button" onClick={() => toggleEditTag(id)} className="hover:text-error-600"><X size={10} /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <input
              value={editTagSearch}
              onChange={(e) => setEditTagSearch(e.target.value)}
              placeholder="Buscar tag…"
              className={inputCls}
            />
            {editTagSearch && (
              <div className="mt-1 border border-neutral-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                {editFilteredTags.slice(0, 6).map((t) => (
                  <button key={t.id} type="button" onClick={() => { toggleEditTag(t.id); setEditTagSearch(""); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-neutral-50 ${editForm.tagIds.includes(t.id) ? "bg-brand-50" : ""}`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </button>
                ))}
                {editTagSearch && !editHasExactMatch && (
                  <button type="button" onClick={handleCreateEditTag} disabled={creatingTag}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50 font-medium border-t border-neutral-100">
                    <Plus size={12} /> Criar &ldquo;{editTagSearch}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">URL de evidência</label>
            <input type="url" value={editForm.evidenceUrl} onChange={(e) => setEF("evidenceUrl", e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Notas</label>
            <textarea value={editForm.notes} onChange={(e) => setEF("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 rounded-lg"
            >
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Excluir nugget">
        <p className="text-sm text-neutral-600 mb-4">
          Tem certeza que deseja excluir este nugget? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold bg-error-600 text-white hover:bg-error-700 disabled:bg-error-300 rounded-lg"
          >
            {isPending ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </Modal>

      {/* Add Relation Modal */}
      <Modal open={relationOpen} onClose={() => { setRelationOpen(false); setRelSearch(""); setRelResults([]); }} title="Adicionar relação">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Tipo de relação</label>
            <div className="flex gap-2">
              {(["COMPLEMENTS", "CONTRADICTS", "DEEPENS"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRelType(val)}
                  className={`flex-1 py-2 text-xs font-medium border rounded-lg transition-colors ${
                    relType === val ? "bg-brand-600 text-white border-brand-600" : "text-neutral-500 border-neutral-200 hover:border-brand-300"
                  }`}
                >
                  {RELATION_LABELS[val]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Buscar nugget</label>
            <input
              value={relSearch}
              onChange={(e) => handleRelSearch(e.target.value)}
              placeholder="Digite para buscar…"
              className={inputCls}
            />
          </div>
          {searching && <p className="text-xs text-neutral-400">Buscando…</p>}
          {relResults.length > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              {relResults.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleAddRelation(n.id)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: n.type.color }} />
                  <div>
                    <p className="text-xs font-medium text-neutral-500">{n.type.name}</p>
                    <p className="text-sm text-neutral-700 line-clamp-2">{n.content}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {relSearch && relResults.length === 0 && !searching && (
            <p className="text-xs text-neutral-400">Nenhum nugget encontrado.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function MetaItem({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-neutral-400 mb-0.5">{label}</p>
      {children}
    </div>
  );
}
