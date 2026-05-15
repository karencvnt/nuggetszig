"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { calculateCompletenessScore, getCompletenessLabel } from "@/lib/utils";

type NuggetType = { id: string; name: string; color: string; icon: string };
type Source = { id: string; title: string };
type Journey = { id: string; name: string; stages: unknown };
type Tag = { id: string; name: string; color: string; category: string };
type Participant = { id: string; code: string };

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors";

const DRAFT_KEY = "nugget-draft";

const EMPTY_FORM = {
  content: "",
  typeId: "",
  sourceId: "",
  participantId: "",
  journeyId: "",
  journeyStage: "",
  sentiment: "" as "" | "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  impact: "" as "" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  evidenceUrl: "",
  notes: "",
  tagIds: [] as string[],
};

export default function NuggetForm({
  nuggetTypes,
  sources,
  journeys,
  allTags,
}: {
  nuggetTypes: NuggetType[];
  sources: Source[];
  journeys: Journey[];
  allTags: Tag[];
}) {
  const router = useRouter();

  const [form, setForm] = useState<typeof EMPTY_FORM>(() => {
    if (typeof window !== "undefined") {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          return { ...EMPTY_FORM, ...JSON.parse(draft) };
        } catch {
          // ignore malformed draft
        }
      }
    }
    return EMPTY_FORM;
  });

  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sourceParticipants, setSourceParticipants] = useState<Participant[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tags, setTags] = useState<Tag[]>(allTags);
  const [creatingTag, setCreatingTag] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }, 30000);
    return () => clearInterval(timer);
  }, [form]);

  useEffect(() => {
    if (!form.sourceId) {
      setSourceParticipants([]);
      setForm((f) => ({ ...f, participantId: "" }));
      return;
    }
    fetch(`/api/sources/${form.sourceId}`)
      .then((r) => r.json())
      .then((data) => {
        const parts = (data.participants ?? []).map(
          (sp: { participant: Participant }) => sp.participant
        );
        setSourceParticipants(parts);
      })
      .catch(() => setSourceParticipants([]));
  }, [form.sourceId]);

  const selectedJourney = journeys.find((j) => j.id === form.journeyId);
  const journeyStages: string[] = selectedJourney ? (selectedJourney.stages as string[]) : [];

  const score = calculateCompletenessScore({
    typeId: form.typeId || null,
    sourceId: form.sourceId || null,
    journeyId: form.journeyId || null,
    tags: form.tagIds,
    sentiment: form.sentiment || null,
    impact: form.impact || null,
    evidenceUrl: form.evidenceUrl || null,
  });
  const completenessLabel = getCompletenessLabel(score);
  const scoreBarColor =
    score <= 40 ? "bg-error-500" : score <= 70 ? "bg-warning-500" : "bg-success-500";

  function set<K extends keyof typeof EMPTY_FORM>(field: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleTag(id: string) {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));
  }

  async function handleCreateTag() {
    const name = tagSearch.trim();
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
        setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
        setForm((f) => ({ ...f, tagIds: [...f.tagIds, tag.id] }));
        setTagSearch("");
      }
    } finally {
      setCreatingTag(false);
    }
  }

  function submit(andNext: boolean) {
    if (!form.content.trim()) {
      setServerError("Conteúdo obrigatório.");
      return;
    }
    if (!form.typeId) {
      setServerError("Tipo obrigatório.");
      return;
    }
    if (!form.sourceId) {
      setServerError("Fonte obrigatória.");
      return;
    }
    setServerError("");

    startTransition(async () => {
      const res = await fetch("/api/nuggets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: form.content,
          typeId: form.typeId,
          sourceId: form.sourceId,
          participantId: form.participantId || null,
          journeyId: form.journeyId || null,
          journeyStage: form.journeyStage || null,
          sentiment: form.sentiment || null,
          impact: form.impact || null,
          evidenceUrl: form.evidenceUrl || null,
          notes: form.notes || null,
          tagIds: form.tagIds,
        }),
      });

      if (res.ok) {
        localStorage.removeItem(DRAFT_KEY);
        const data = await res.json();
        if (andNext) {
          setForm({
            ...EMPTY_FORM,
            typeId: form.typeId,
            sourceId: form.sourceId,
            journeyId: form.journeyId,
            journeyStage: form.journeyStage,
          });
          setServerError("");
        } else {
          router.push(`/app/nuggets/${data.id}`);
        }
      } else {
        const d = await res.json();
        setServerError(d.error ?? "Erro ao salvar.");
      }
    });
  }

  const filteredTags = tags.filter(
    (t) => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );
  const hasExactMatch = tags.some((t) => t.name.toLowerCase() === tagSearch.toLowerCase());
  const selectedType = nuggetTypes.find((t) => t.id === form.typeId);

  return (
    <div className="space-y-6">
      {/* Completeness bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-500">Completude do nugget</span>
          <span className="text-xs font-semibold text-neutral-700">
            {score}% — {completenessLabel}
          </span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${scoreBarColor} transition-all duration-300`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {serverError && (
        <div className="px-4 py-3 bg-error-50 text-error-700 rounded-lg text-sm">{serverError}</div>
      )}

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Conteúdo *</label>
        <div className="relative">
          <textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value.slice(0, 500))}
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="Descreva o insight, observação ou dado encontrado…"
          />
          <span
            className={`absolute bottom-2 right-3 text-xs ${
              form.content.length >= 490 ? "text-error-500" : "text-neutral-400"
            }`}
          >
            {form.content.length}/500
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tipo *</label>
          <div className="relative">
            {selectedType && (
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex-shrink-0 pointer-events-none"
                style={{ backgroundColor: selectedType.color }}
              />
            )}
            <select
              value={form.typeId}
              onChange={(e) => set("typeId", e.target.value)}
              className={`${inputCls} ${selectedType ? "pl-8" : ""}`}
            >
              <option value="">Selecione o tipo</option>
              {nuggetTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Fonte *</label>
          <select
            value={form.sourceId}
            onChange={(e) => set("sourceId", e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione a fonte</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Participant (shown when source has participants) */}
      {form.sourceId && sourceParticipants.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Participante</label>
          <select
            value={form.participantId}
            onChange={(e) => set("participantId", e.target.value)}
            className={inputCls}
          >
            <option value="">Nenhum participante</option>
            {sourceParticipants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Journey */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Jornada</label>
          <select
            value={form.journeyId}
            onChange={(e) => {
              set("journeyId", e.target.value);
              set("journeyStage", "");
            }}
            className={inputCls}
          >
            <option value="">Sem jornada</option>
            {journeys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        {/* Journey Stage */}
        {form.journeyId && journeyStages.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Etapa da jornada
            </label>
            <select
              value={form.journeyStage}
              onChange={(e) => set("journeyStage", e.target.value)}
              className={inputCls}
            >
              <option value="">Sem etapa</option>
              {journeyStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Sentiment */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Sentimento</label>
        <div className="flex gap-2">
          {(
            [
              ["POSITIVE", "Positivo", "text-success-700 border-success-400 bg-success-50"],
              ["NEUTRAL", "Neutro", "text-neutral-700 border-neutral-400 bg-neutral-100"],
              ["NEGATIVE", "Negativo", "text-error-700 border-error-400 bg-error-50"],
            ] as [string, string, string][]
          ).map(([val, lbl, activeCls]) => (
            <button
              key={val}
              type="button"
              onClick={() => set("sentiment", form.sentiment === val ? "" : (val as typeof form.sentiment))}
              className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors ${
                form.sentiment === val
                  ? activeCls
                  : "text-neutral-400 border-neutral-200 hover:border-neutral-300 hover:text-neutral-600"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Impact */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Impacto</label>
        <div className="flex gap-2">
          {(
            [
              ["LOW", "Baixo"],
              ["MEDIUM", "Médio"],
              ["HIGH", "Alto"],
              ["CRITICAL", "Crítico"],
            ] as [string, string][]
          ).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => set("impact", form.impact === val ? "" : (val as typeof form.impact))}
              className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors ${
                form.impact === val
                  ? "bg-brand-600 text-white border-brand-600"
                  : "text-neutral-500 border-neutral-200 hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Tags</label>
        {form.tagIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tagIds.map((id) => {
              const tag = tags.find((t) => t.id === id);
              if (!tag) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => toggleTag(id)}
                    className="hover:text-error-600 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <input
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (tagSearch && !hasExactMatch) handleCreateTag();
              else if (filteredTags[0] && !form.tagIds.includes(filteredTags[0].id)) {
                toggleTag(filteredTags[0].id);
                setTagSearch("");
              }
            }
          }}
          placeholder="Buscar ou criar tag…"
          className={inputCls}
        />
        {tagSearch && (
          <div className="mt-1.5 border border-neutral-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto shadow-sm">
            {filteredTags.slice(0, 8).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  toggleTag(t.id);
                  setTagSearch("");
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-50 ${
                  form.tagIds.includes(t.id) ? "bg-brand-50" : ""
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
                <span className="text-xs text-neutral-400 ml-auto">{t.category}</span>
              </button>
            ))}
            {tagSearch && !hasExactMatch && (
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={creatingTag}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 font-medium border-t border-neutral-100"
              >
                <Plus size={14} />
                Criar &ldquo;{tagSearch}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Evidence URL */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">URL de evidência</label>
        <input
          type="url"
          value={form.evidenceUrl}
          onChange={(e) => set("evidenceUrl", e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Notas internas</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className={`${inputCls} resize-none`}
          placeholder="Contexto adicional, próximos passos…"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium border border-brand-600 text-brand-600 hover:bg-brand-50 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isPending ? "Salvando…" : "Salvar e criar próximo"}
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 rounded-lg transition-colors"
          >
            {isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
