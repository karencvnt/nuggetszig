"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Search, X, LayoutList, LayoutGrid, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatRelativeTime } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type NuggetType = { id: string; name: string; color: string; icon: string };
type Journey = { id: string; name: string; stages: unknown };
type Segment = { id: string; name: string };
type Tag = { id: string; name: string; color: string; category: string };
type User = { id: string; name: string };

type NuggetItem = {
  id: string;
  content: string;
  type: NuggetType;
  source: { id: string; title: string };
  participant: { id: string; code: string } | null;
  createdBy: { id: string; name: string };
  tags: { tag: { id: string; name: string; color: string } }[];
  status: string;
  sentiment: string | null;
  impact: string | null;
  completenessScore: number;
  _count: { relationsFrom: number; relationsTo: number };
  createdAt: string | Date;
};

type FilterState = {
  q: string;
  types: string[];
  statuses: string[];
  sentiments: string[];
  journeyId: string;
  stage: string;
  segments: string[];
  tagIds: string[];
  from: string;
  to: string;
  squad: string;
  createdBy: string;
  sortBy: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const LIMIT = 50;

const STATUS_OPTIONS = [
  { value: "NEW", label: "Novo" },
  { value: "VALIDATED", label: "Validado" },
  { value: "INVESTIGATING", label: "Investigando" },
  { value: "DISCARDED", label: "Descartado" },
  { value: "ADDRESSED", label: "Tratado" },
];

const SENTIMENT_OPTIONS = [
  { value: "POSITIVE", label: "Positivo" },
  { value: "NEUTRAL", label: "Neutro" },
  { value: "NEGATIVE", label: "Negativo" },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-neutral-100 text-neutral-600",
  VALIDATED: "bg-success-50 text-success-700",
  INVESTIGATING: "bg-warning-50 text-warning-700",
  DISCARDED: "bg-neutral-100 text-neutral-400",
  ADDRESSED: "bg-brand-50 text-brand-700",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filtersToUrlParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.statuses.length) p.set("status", f.statuses.join(","));
  if (f.sentiments.length) p.set("sentiment", f.sentiments.join(","));
  if (f.journeyId) p.set("journey", f.journeyId);
  if (f.stage) p.set("stage", f.stage);
  if (f.segments.length) p.set("segment", f.segments.join(","));
  if (f.tagIds.length) p.set("tags", f.tagIds.join(","));
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.squad) p.set("squad", f.squad);
  if (f.createdBy) p.set("createdBy", f.createdBy);
  if (f.sortBy !== "createdAt_desc") p.set("sortBy", f.sortBy);
  return p;
}

function filtersToApiParams(f: FilterState, skip: number): string {
  const p = filtersToUrlParams(f);
  p.set("skip", String(skip));
  p.set("limit", String(LIMIT));
  return p.toString();
}

function hasActiveFilters(f: FilterState): boolean {
  return !!(
    f.q || f.types.length || f.statuses.length || f.sentiments.length ||
    f.journeyId || f.stage || f.segments.length || f.tagIds.length ||
    f.from || f.to || f.squad || f.createdBy || f.sortBy !== "createdAt_desc"
  );
}

const EMPTY_FILTERS: FilterState = {
  q: "", types: [], statuses: [], sentiments: [],
  journeyId: "", stage: "", segments: [], tagIds: [],
  from: "", to: "", squad: "", createdBy: "", sortBy: "createdAt_desc",
};

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-yellow-100 text-neutral-900 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NuggetsClient({
  initialItems,
  initialTotal,
  initialFilters,
  nuggetTypes,
  journeys,
  segments,
  allTags,
  users,
  canCreate,
}: {
  initialItems: NuggetItem[];
  initialTotal: number;
  initialFilters: FilterState;
  nuggetTypes: NuggetType[];
  journeys: Journey[];
  segments: Segment[];
  allTags: Tag[];
  users: User[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [items, setItems] = useState<NuggetItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialTotal > LIMIT);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(LIMIT);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const isFirst = useRef(true);
  const prevQ = useRef(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync filters → URL + fetch
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    // URL update (always immediate, use replace to avoid polluting history)
    const params = filtersToUrlParams(filters);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    // Debounce only for text search, immediate for everything else
    const delay = filters.q !== prevQ.current ? 300 : 0;
    prevQ.current = filters.q;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchItems(filters, 0);
    }, delay);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function fetchItems(f: FilterState, offset: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/nuggets?${filtersToApiParams(f, offset)}`);
      const data = await res.json();
      if (offset === 0) {
        setItems(data.items);
        setSkip(LIMIT);
      } else {
        setItems((prev) => [...prev, ...data.items]);
        setSkip(offset + LIMIT);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }

  function setF(partial: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  function toggleMulti(field: "types" | "statuses" | "sentiments" | "segments" | "tagIds", val: string) {
    setFilters((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
      };
    });
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
  }

  const active = hasActiveFilters(filters);

  const selectedJourney = journeys.find((j) => j.id === filters.journeyId);
  const journeyStages: string[] = selectedJourney ? (selectedJourney.stages as string[]) : [];

  const filteredTags = allTags.filter(
    (t) => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // Kanban: group items by typeId
  const kanbanColumns = nuggetTypes.map((t) => ({
    type: t,
    nuggets: items.filter((n) => n.type.id === t.id),
  })).filter((col) => col.nuggets.length > 0 || !active);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Repositório</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {loading ? "Carregando…" : `${total} nugget${total !== 1 ? "s" : ""}${active ? " encontrado" + (total !== 1 ? "s" : "") : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`p-2 transition-colors ${view === "list" ? "bg-brand-600 text-white" : "text-neutral-400 hover:bg-neutral-50"}`}
              title="Lista"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-2 transition-colors ${view === "kanban" ? "bg-brand-600 text-white" : "text-neutral-400 hover:bg-neutral-50"}`}
              title="Kanban"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          {canCreate && (
            <Link
              href="/app/nuggets/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Plus size={15} /> Novo nugget
            </Link>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={filters.q}
          onChange={(e) => setF({ q: e.target.value })}
          placeholder="Buscar no conteúdo dos nuggets…"
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
        />
        {filters.q && (
          <button
            onClick={() => setF({ q: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Quick filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Type toggle buttons */}
        {nuggetTypes.map((t) => (
          <button
            key={t.id}
            onClick={() => toggleMulti("types", t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filters.types.includes(t.id)
                ? "border-transparent text-white"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
            }`}
            style={filters.types.includes(t.id) ? { backgroundColor: t.color, borderColor: t.color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: filters.types.includes(t.id) ? "rgba(255,255,255,0.7)" : t.color }}
            />
            {t.name}
          </button>
        ))}

        <div className="w-px h-5 bg-neutral-200 mx-1" />

        {/* Status filter dropdown */}
        <FilterDropdown
          label="Status"
          count={filters.statuses.length}
          options={STATUS_OPTIONS}
          value={filters.statuses}
          onToggle={(v) => toggleMulti("statuses", v)}
        />

        {/* Sentiment filter */}
        <FilterDropdown
          label="Sentimento"
          count={filters.sentiments.length}
          options={SENTIMENT_OPTIONS}
          value={filters.sentiments}
          onToggle={(v) => toggleMulti("sentiments", v)}
        />

        {/* More filters button */}
        <button
          onClick={() => setMoreFiltersOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            filters.journeyId || filters.segments.length || filters.tagIds.length || filters.from || filters.to || filters.squad || filters.createdBy
              ? "border-brand-500 text-brand-600 bg-brand-50"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
          }`}
        >
          <SlidersHorizontal size={13} /> Mais filtros
          {(filters.journeyId || filters.segments.length || filters.tagIds.length || filters.from || filters.to || filters.squad || filters.createdBy) && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center">
              {[filters.journeyId, ...filters.segments, ...filters.tagIds, filters.from, filters.to, filters.squad, filters.createdBy].filter(Boolean).length}
            </span>
          )}
        </button>

        {active && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors ml-auto"
          >
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Results */}
      {items.length === 0 && !loading ? (
        <EmptyState active={active} canCreate={canCreate} onClear={clearAll} />
      ) : view === "list" ? (
        <ListView items={items} q={filters.q} />
      ) : (
        <KanbanView columns={kanbanColumns} q={filters.q} />
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchItems(filters, skip)}
            className="px-6 py-2.5 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Carregar mais
          </button>
        </div>
      )}

      {loading && items.length > 0 && (
        <p className="mt-4 text-center text-sm text-neutral-400">Carregando…</p>
      )}

      {/* Sort bar */}
      {items.length > 0 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-neutral-400">
          <span>Ordenar por:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => setF({ sortBy: e.target.value })}
            className="border border-neutral-200 rounded px-2 py-1 text-xs text-neutral-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="createdAt_desc">Mais recentes</option>
            <option value="createdAt_asc">Mais antigos</option>
            <option value="completenessScore_desc">Maior completude</option>
          </select>
        </div>
      )}

      {/* More Filters Modal */}
      <Modal open={moreFiltersOpen} onClose={() => setMoreFiltersOpen(false)} title="Mais filtros">
        <div className="space-y-4">
          {/* Journey cascade */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Jornada</label>
            <select
              value={filters.journeyId}
              onChange={(e) => setF({ journeyId: e.target.value, stage: "" })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todas as jornadas</option>
              {journeys.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>

          {filters.journeyId && journeyStages.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Etapa</label>
              <select
                value={filters.stage}
                onChange={(e) => setF({ stage: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todas as etapas</option>
                {journeyStages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Segments */}
          {segments.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-2">Segmento</label>
              <div className="flex flex-wrap gap-1.5">
                {segments.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleMulti("segments", s.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filters.segments.includes(s.id)
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-2">Tags</label>
            {filters.tagIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {filters.tagIds.map((id) => {
                  const tag = allTags.find((t) => t.id === id);
                  if (!tag) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                      <button onClick={() => toggleMulti("tagIds", id)} className="hover:text-error-600"><X size={10} /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <input
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Buscar tags…"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {tagSearch && (
              <div className="mt-1 border border-neutral-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                {filteredTags.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { toggleMulti("tagIds", t.id); setTagSearch(""); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-50 ${filters.tagIds.includes(t.id) ? "bg-brand-50" : ""}`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    {t.name}
                    <span className="ml-auto text-xs text-neutral-400">{t.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">De</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setF({ from: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Até</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setF({ to: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Squad */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Squad</label>
            <input
              value={filters.squad}
              onChange={(e) => setF({ squad: e.target.value })}
              placeholder="Ex: Growth"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Created by */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Criado por</label>
            <select
              value={filters.createdBy}
              onChange={(e) => setF({ createdBy: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => {
                setF({
                  journeyId: "", stage: "", segments: [], tagIds: [],
                  from: "", to: "", squad: "", createdBy: "",
                });
                setMoreFiltersOpen(false);
              }}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Limpar
            </button>
            <button
              onClick={() => setMoreFiltersOpen(false)}
              className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 rounded-lg"
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  count,
  options,
  value,
  onToggle,
}: {
  label: string;
  count: number;
  options: { value: string; label: string }[];
  value: string[];
  onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          count > 0
            ? "border-brand-500 text-brand-600 bg-brand-50"
            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center">
            {count}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 min-w-[140px] py-1">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-neutral-50 transition-colors ${
                value.includes(o.value) ? "text-brand-700 font-medium" : "text-neutral-700"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                  value.includes(o.value) ? "bg-brand-600 border-brand-600" : "border-neutral-300"
                }`}
              >
                {value.includes(o.value) && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListView({ items, q }: { items: NuggetItem[]; q: string }) {
  return (
    <div className="grid gap-3">
      {items.map((n) => (
        <Link
          key={n.id}
          href={`/app/nuggets/${n.id}`}
          className="block bg-white border border-neutral-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-3">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: n.type.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-medium text-neutral-500">{n.type.name}</span>
                <span className="text-xs text-neutral-300">·</span>
                <span className="text-xs text-neutral-400 truncate max-w-[180px]">{n.source.title}</span>
                {n.participant && (
                  <>
                    <span className="text-xs text-neutral-300">·</span>
                    <span className="text-xs font-mono text-neutral-400">{n.participant.code}</span>
                  </>
                )}
                <span
                  className={`ml-auto px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[n.status] ?? "bg-neutral-100 text-neutral-500"}`}
                >
                  {STATUS_OPTIONS.find((s) => s.value === n.status)?.label ?? n.status}
                </span>
              </div>
              <p className="text-sm text-neutral-800 line-clamp-3">
                <Highlight text={n.content} q={q} />
              </p>
              <div className="flex items-center gap-2 mt-2">
                {n.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {n.tags.slice(0, 4).map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-600"
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                    ))}
                    {n.tags.length > 4 && (
                      <span className="text-xs text-neutral-400">+{n.tags.length - 4}</span>
                    )}
                  </div>
                )}
                <div className="ml-auto flex items-center gap-3 text-xs text-neutral-400 flex-shrink-0">
                  {n.sentiment && (
                    <span>{n.sentiment === "POSITIVE" ? "😊" : n.sentiment === "NEGATIVE" ? "😞" : "😐"}</span>
                  )}
                  <span>{n.createdBy.name}</span>
                  <span>{formatRelativeTime(n.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function KanbanView({
  columns,
  q,
}: {
  columns: { type: NuggetType; nuggets: NuggetItem[] }[];
  q: string;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(({ type, nuggets }) => (
        <div key={type.id} className="flex-shrink-0 w-72">
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
            style={{ backgroundColor: type.color + "18" }}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
            <span className="text-sm font-semibold text-neutral-700">{type.name}</span>
            <span className="ml-auto text-xs text-neutral-500 font-medium">{nuggets.length}</span>
          </div>
          <div className="space-y-2">
            {nuggets.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">Nenhum nugget</p>
            ) : (
              nuggets.map((n) => (
                <Link
                  key={n.id}
                  href={`/app/nuggets/${n.id}`}
                  className="block bg-white border border-neutral-200 rounded-lg p-3 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <p className="text-xs text-neutral-700 line-clamp-3 mb-2">
                    <Highlight text={n.content} q={q} />
                  </p>
                  <div className="flex items-center gap-1.5">
                    {n.tags.slice(0, 2).map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-500"
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                    ))}
                    <span
                      className={`ml-auto px-1.5 py-0.5 text-[10px] rounded-full font-medium ${STATUS_COLORS[n.status] ?? "bg-neutral-100 text-neutral-500"}`}
                    >
                      {STATUS_OPTIONS.find((s) => s.value === n.status)?.label ?? n.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
      {columns.length === 0 && (
        <p className="text-sm text-neutral-400 py-8 w-full text-center">Nenhum tipo com nuggets</p>
      )}
    </div>
  );
}

function EmptyState({
  active,
  canCreate,
  onClear,
}: {
  active: boolean;
  canCreate: boolean;
  onClear: () => void;
}) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
        <Search size={28} className="text-neutral-300" />
      </div>
      {active ? (
        <>
          <p className="text-base font-medium text-neutral-700 mb-1">
            Nenhum nugget encontrado com esses filtros
          </p>
          <p className="text-sm text-neutral-400 mb-4">Tente remover alguns filtros</p>
          <button
            onClick={onClear}
            className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Limpar tudo
          </button>
        </>
      ) : (
        <>
          <p className="text-base font-medium text-neutral-700 mb-1">Nenhum nugget ainda</p>
          {canCreate && (
            <Link
              href="/app/nuggets/new"
              className="inline-block mt-2 text-sm text-brand-600 hover:underline"
            >
              Crie o primeiro nugget
            </Link>
          )}
        </>
      )}
    </div>
  );
}
