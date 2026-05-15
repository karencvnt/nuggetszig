"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

type Pref = { eventType: string; isEnabled: boolean };
type Tag = { id: string; name: string; color: string; category: string };
type Journey = { id: string; name: string; color: string | null };

const EVENT_LABELS: Record<string, { label: string; description: string }> = {
  NEW_NUGGET_TAG: {
    label: "Novos nuggets com tags do meu interesse",
    description: "Notificação quando um nugget é criado com uma tag que você acompanha.",
  },
  NEW_NUGGET_JOURNEY: {
    label: "Novos nuggets na jornada que acompanho",
    description: "Notificação quando um nugget é criado em uma jornada do seu interesse.",
  },
  COMMENT_ON_MY_NUGGET: {
    label: "Comentários em nuggets que criei",
    description: "Notificação quando alguém comenta em um nugget seu.",
  },
  MENTION: {
    label: "Menções nos comentários",
    description: "Notificação quando você é mencionado em um comentário.",
  },
  WEEKLY_DIGEST: {
    label: "Digest semanal por e-mail",
    description: "Resumo toda segunda-feira com os nuggets relevantes da semana.",
  },
};

export default function NotificationPreferencesClient({
  initialPrefs,
  initialTagIds,
  initialJourneyIds,
  allTags,
  allJourneys,
}: {
  initialPrefs: Pref[];
  initialTagIds: string[];
  initialJourneyIds: string[];
  allTags: Tag[];
  allJourneys: Journey[];
}) {
  const toast = useToast();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [tagIds, setTagIds] = useState(new Set(initialTagIds));
  const [journeyIds, setJourneyIds] = useState(new Set(initialJourneyIds));
  const [saving, setSaving] = useState(false);

  function togglePref(eventType: string) {
    setPrefs((prev) => prev.map((p) => (p.eventType === eventType ? { ...p, isEnabled: !p.isEnabled } : p)));
  }

  function toggleTag(id: string) {
    setTagIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleJourney(id: string) {
    setJourneyIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/account/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs, tagIds: [...tagIds], journeyIds: [...journeyIds] }),
    });
    if (res.ok) {
      toast.success("Preferências salvas com sucesso!");
    } else {
      toast.error("Erro ao salvar preferências.");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-neutral-900 mb-6">Preferências de notificação</h1>

      {/* Notification types */}
      <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100 mb-6">
        {prefs.map((pref) => {
          const meta = EVENT_LABELS[pref.eventType];
          if (!meta) return null;
          return (
            <label key={pref.eventType} className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="checkbox"
                checked={pref.isEnabled}
                onChange={() => togglePref(pref.eventType)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-neutral-800">{meta.label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{meta.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Interest tags */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-neutral-700 mb-2">Tags de interesse</h2>
        <p className="text-xs text-neutral-400 mb-3">Selecione as tags que você quer monitorar.</p>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${tagIds.has(tag.id) ? "border-transparent text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}
              style={tagIds.has(tag.id) ? { backgroundColor: tag.color } : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tagIds.has(tag.id) ? "white" : tag.color }} />
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Interest journeys */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-700 mb-2">Jornadas de interesse</h2>
        <p className="text-xs text-neutral-400 mb-3">Selecione as jornadas que você quer monitorar.</p>
        <div className="flex flex-wrap gap-2">
          {allJourneys.map((j) => (
            <button
              key={j.id}
              onClick={() => toggleJourney(j.id)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${journeyIds.has(j.id) ? "bg-brand-600 border-brand-600 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}
            >
              {j.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-6 py-2.5 text-sm font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Salvando..." : "Salvar preferências"}
      </button>
    </div>
  );
}
