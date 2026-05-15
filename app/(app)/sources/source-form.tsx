"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  methodId: z.string().min(1, "Método obrigatório"),
  squad: z.string().optional(),
  description: z.string().optional(),
  objective: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  participantCount: z.coerce.number().int().min(0).optional().or(z.literal("")),
  artifactUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

type Method = { id: string; name: string; category: string };
type SourceData = {
  id?: string; title?: string; methodId?: string; squad?: string | null;
  description?: string | null; objective?: string | null;
  startDate?: Date | null; endDate?: Date | null;
  participantCount?: number | null; artifactUrl?: string | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors";
const textareaCls = `${inputCls} resize-none`;

export default function SourceForm({ methods, initial }: { methods: Method[]; initial?: SourceData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    methodId: initial?.methodId ?? "",
    squad: initial?.squad ?? "",
    description: initial?.description ?? "",
    objective: initial?.objective ?? "",
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().split("T")[0] : "",
    endDate: initial?.endDate ? new Date(initial.endDate).toISOString().split("T")[0] : "",
    participantCount: initial?.participantCount?.toString() ?? "",
    artifactUrl: initial?.artifactUrl ?? "",
    status: (initial?.status ?? "DRAFT") as "DRAFT" | "ACTIVE" | "ARCHIVED",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError("");

    startTransition(async () => {
      const payload = {
        ...result.data,
        participantCount: result.data.participantCount === "" ? null : Number(result.data.participantCount),
        startDate: result.data.startDate ? new Date(result.data.startDate).toISOString() : null,
        endDate: result.data.endDate ? new Date(result.data.endDate).toISOString() : null,
        artifactUrl: result.data.artifactUrl || null,
      };

      const url = isEdit ? `/api/sources/${initial!.id}` : "/api/sources";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/app/sources/${data.id}`);
      } else {
        const data = await res.json();
        setServerError(data.error ?? "Erro ao salvar.");
      }
    });
  }

  const byCategory: Record<string, Method[]> = {};
  methods.forEach((m) => {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  });

  const CATEGORY_LABELS: Record<string, string> = {
    qualitativo: "Qualitativo", quantitativo: "Quantitativo", "desk research": "Desk Research",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && (
        <div className="px-4 py-3 bg-error-50 text-error-700 rounded-lg text-sm">{serverError}</div>
      )}

      <Field label="Título *" error={errors.title}>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} required />
      </Field>

      <Field label="Método de pesquisa *" error={errors.methodId}>
        <select value={form.methodId} onChange={(e) => set("methodId", e.target.value)} className={inputCls} required>
          <option value="">Selecione um método</option>
          {Object.entries(byCategory).map(([cat, ms]) => (
            <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
              {ms.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Squad" error={errors.squad}>
          <input value={form.squad} onChange={(e) => set("squad", e.target.value)} placeholder="Ex: Growth" className={inputCls} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value as typeof form.status)} className={inputCls}>
            <option value="DRAFT">Rascunho</option>
            <option value="ACTIVE">Ativa</option>
            <option value="ARCHIVED">Arquivada</option>
          </select>
        </Field>
      </div>

      <Field label="Descrição" error={errors.description}>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={textareaCls} placeholder="O que esta pesquisa aborda?" />
      </Field>

      <Field label="Objetivo" error={errors.objective}>
        <textarea value={form.objective} onChange={(e) => set("objective", e.target.value)} rows={3} className={textareaCls} placeholder="Qual pergunta esta pesquisa responde?" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data de início">
          <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Data de término">
          <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Nº de participantes" error={errors.participantCount}>
        <input type="number" min={0} value={form.participantCount} onChange={(e) => set("participantCount", e.target.value)} className={inputCls} />
      </Field>

      <Field label="Link do artefato" error={errors.artifactUrl}>
        <input type="url" value={form.artifactUrl} onChange={(e) => set("artifactUrl", e.target.value)} placeholder="https://notion.so/..." className={inputCls} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 rounded-lg transition-colors"
        >
          {isPending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar fonte"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-error-600">{error}</p>}
    </div>
  );
}
