"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Download } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import Papa from "papaparse";

type Step = "upload" | "map" | "validate" | "import";

const NUGGET_FIELDS = [
  { key: "content", label: "Conteúdo", required: true },
  { key: "type", label: "Tipo" },
  { key: "source", label: "Fonte" },
  { key: "stage", label: "Etapa da jornada" },
  { key: "tags", label: "Tags (separadas por vírgula)" },
  { key: "sentiment", label: "Sentimento" },
  { key: "impact", label: "Impacto" },
  { key: "notes", label: "Notas" },
];

type RowResult = {
  row: number;
  status: "valid" | "warning" | "error";
  message?: string;
};

type ValidationResult = {
  valid: number;
  warnings: number;
  errors: number;
  results: RowResult[];
};

export default function ImportClient() {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | undefined>(undefined);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv") && !f.name.endsWith(".txt")) {
      toast.error("Apenas arquivos CSV são suportados.");
      return;
    }
    setFile(f);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields ?? [];
        setColumns(cols);
        setPreview(result.data.slice(0, 3) as Record<string, string>[]);
        const auto: Record<string, string> = {};
        NUGGET_FIELDS.forEach(({ key }) => {
          const match = cols.find(
            (c) => c.toLowerCase().includes(key) || key.includes(c.toLowerCase())
          );
          if (match) auto[key] = match;
        });
        setMapping(auto);
        setStep("map");
      },
    });
  }, [toast]);

  async function handleValidate() {
    if (!file || !mapping.content) { toast.error("Mapeie pelo menos o campo Conteúdo."); return; }
    setValidating(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(mapping));
    fd.append("validateOnly", "true");
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setValidation(data);
    setStep("validate");
    setValidating(false);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(mapping));
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setImportResult(data);
    setStep("import");
    setImporting(false);
  }

  function downloadTemplate() {
    const header = "conteúdo,tipo,fonte,etapa,tags,sentimento,impacto,notas";
    const row1 = '"Usuários têm dificuldade em encontrar o histórico de compras",Problema,"Entrevistas Q1",Checkout,"usabilidade; checkout","Negativo","Alto","Mencionado por 8 de 10 entrevistados"';
    const row2 = '"A funcionalidade de busca está sendo bem avaliada",Insight,"Survey NPS",Busca,"search; satisfação","Positivo","Médio",""';
    const csv = [header, row1, row2].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "template-importacao-nuggets.csv";
    a.click();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Importar nuggets</h1>
          <p className="text-sm text-neutral-500 mt-1">Importe nuggets a partir de um arquivo CSV</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <Download size={12} /> Baixar template CSV
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["upload", "map", "validate", "import"] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = { upload: "Upload", map: "Mapeamento", validate: "Validação", import: "Importação" };
          const stepIdx = ["upload", "map", "validate", "import"].indexOf(step);
          const thisIdx = i;
          const done = thisIdx < stepIdx;
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${done || active ? "bg-brand-400" : "bg-neutral-200"}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${active ? "bg-brand-600 text-white" : done ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-400"}`}>
                <span>{i + 1}</span>
                <span>{labels[s]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${dragOver ? "border-brand-400 bg-brand-50" : "border-neutral-200 hover:border-neutral-300"}`}
        >
          <input
            ref={(el) => { fileRef.current = el ?? undefined; }}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <Upload size={32} className="mx-auto text-neutral-300 mb-3" />
          <p className="text-sm font-medium text-neutral-700">Arraste um arquivo CSV ou clique para selecionar</p>
          <p className="text-xs text-neutral-400 mt-1">Máximo de 1000 linhas por importação</p>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "map" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-neutral-400" />
            <span className="text-sm text-neutral-600">{file?.name}</span>
            <span className="text-xs text-neutral-400">· {columns.length} colunas detectadas</span>
          </div>

          {/* Preview */}
          <div className="overflow-x-auto mb-6">
            <table className="text-xs w-full border border-neutral-200 rounded-lg overflow-hidden">
              <thead className="bg-neutral-50">
                <tr>{columns.map((c) => <th key={c} className="px-3 py-2 text-left font-medium text-neutral-600 border-b border-neutral-200">{c}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    {columns.map((c) => <td key={c} className="px-3 py-2 text-neutral-700 max-w-[200px] truncate">{row[c]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mapping */}
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">Mapear colunas</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {NUGGET_FIELDS.map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  {label} {required && <span className="text-error-500">*</span>}
                </label>
                <select
                  value={mapping[key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-400"
                >
                  <option value="">— não mapear —</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setStep("upload")} className="px-4 py-2 text-sm border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50">
              Voltar
            </button>
            <button
              onClick={handleValidate}
              disabled={validating || !mapping.content}
              className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {validating ? "Validando..." : "Validar dados"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation */}
      {step === "validate" && validation && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-success-50 border border-success-200 rounded-xl p-4 text-center">
              <CheckCircle size={20} className="mx-auto text-success-500 mb-1" />
              <p className="text-2xl font-bold text-success-700">{validation.valid}</p>
              <p className="text-xs text-success-600">Linhas válidas</p>
            </div>
            <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 text-center">
              <AlertTriangle size={20} className="mx-auto text-warning-500 mb-1" />
              <p className="text-2xl font-bold text-warning-700">{validation.warnings}</p>
              <p className="text-xs text-warning-600">Com avisos</p>
            </div>
            <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-center">
              <XCircle size={20} className="mx-auto text-error-500 mb-1" />
              <p className="text-2xl font-bold text-error-700">{validation.errors}</p>
              <p className="text-xs text-error-600">Com erros</p>
            </div>
          </div>

          {validation.results.filter((r) => r.status !== "valid").length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Detalhes</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {validation.results
                  .filter((r) => r.status !== "valid")
                  .map((r) => (
                    <div
                      key={r.row}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${r.status === "error" ? "bg-error-50 text-error-700" : "bg-warning-50 text-warning-700"}`}
                    >
                      {r.status === "error" ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                      <span className="font-medium">Linha {r.row}:</span>
                      <span>{r.message}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setStep("map")} className="px-4 py-2 text-sm border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50">
              Voltar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validation.valid + validation.warnings === 0}
              className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {importing ? "Importando..." : `Importar ${validation.valid + validation.warnings} nuggets`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Import result */}
      {step === "import" && importResult && (
        <div className="text-center py-10">
          <CheckCircle size={48} className="mx-auto text-success-500 mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Importação concluída!</h2>
          <p className="text-sm text-neutral-600 mb-1">
            <span className="font-semibold text-success-700">{importResult.imported} nuggets</span> importados com sucesso.
          </p>
          {importResult.failed > 0 && (
            <p className="text-sm text-neutral-500">{importResult.failed} falharam durante a importação.</p>
          )}
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => { setStep("upload"); setFile(null); setValidation(null); setImportResult(null); }}
              className="px-4 py-2 text-sm border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50"
            >
              Nova importação
            </button>
            <button
              onClick={() => router.push("/app/nuggets")}
              className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              Ver nuggets
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
