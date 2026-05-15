"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  GripVertical, Plus, Trash2, Share2, Download, ExternalLink,
  Lock, Users, Globe, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { TagPill, TypeBadge } from "@/components/ui/nugget-card";
import { formatRelativeTime } from "@/lib/utils";

type Tag = { id: string; name: string; color: string };
type NuggetType = { id: string; name: string; color: string };

type CollectionNugget = {
  nuggetId: string;
  note: string | null;
  order: number;
  addedAt: string | Date;
  addedBy: { id: string; name: string };
  nugget: {
    id: string;
    content: string;
    status: string;
    type: NuggetType;
    source: { id: string; title: string };
    tags: { tag: Tag }[];
    createdBy: { name: string };
    createdAt: string | Date;
  };
};

type Collection = {
  id: string;
  title: string;
  description: string | null;
  context: string | null;
  visibility: "PRIVATE" | "TEAM" | "COMPANY";
  createdBy: { id: string; name: string };
  nuggets: CollectionNugget[];
};

const VISIBILITY_ICON = { PRIVATE: <Lock size={12} />, TEAM: <Users size={12} />, COMPANY: <Globe size={12} /> };
const VISIBILITY_LABEL = { PRIVATE: "Privada", TEAM: "Time", COMPANY: "Empresa" };

export default function CollectionDetailClient({
  collection: initial,
  userId,
  canEdit,
}: {
  collection: Collection;
  userId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [nuggets, setNuggets] = useState(initial.nuggets);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<CollectionNugget["nugget"][]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const existingIds = new Set(nuggets.map((cn) => cn.nuggetId));

  async function searchNuggets(q: string) {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/nuggets?q=${encodeURIComponent(q)}&limit=20`);
    const data = await res.json();
    setSearchResults((data.items ?? []).filter((n: { id: string }) => !existingIds.has(n.id)));
    setSearching(false);
  }

  async function handleAdd() {
    if (selectedIds.length === 0) return;
    setAdding(true);
    const res = await fetch(`/api/collections/${initial.id}/nuggets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nuggetIds: selectedIds }),
    });
    if (res.ok) {
      toast.success(`${selectedIds.length} nugget(s) adicionado(s).`);
      router.refresh();
      setShowAddModal(false);
      setSelectedIds([]);
    } else {
      toast.error("Erro ao adicionar nuggets.");
    }
    setAdding(false);
  }

  async function handleRemove(nuggetId: string) {
    if (!confirm("Remover nugget desta coleção?")) return;
    const res = await fetch(`/api/collections/${initial.id}/nuggets/${nuggetId}`, { method: "DELETE" });
    if (res.ok) {
      setNuggets((prev) => prev.filter((cn) => cn.nuggetId !== nuggetId));
      toast.success("Nugget removido da coleção.");
    } else {
      toast.error("Erro ao remover nugget.");
    }
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = Array.from(nuggets);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setNuggets(reordered);

    await fetch(`/api/collections/${initial.id}/nuggets/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((cn) => cn.nuggetId) }),
    });
  }

  function handleExport(format: "pdf" | "markdown" | "csv") {
    const url = `/api/collections/${initial.id}/export?format=${format}`;
    if (format === "pdf") {
      window.open(url, "_blank");
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.click();
    }
  }

  const shareUrl = `${window.location.origin}/share/collections/${initial.id}`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Back */}
      <Link href="/app/collections" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft size={14} /> Coleções
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-neutral-900">{initial.title}</h1>
            <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
              {VISIBILITY_ICON[initial.visibility]} {VISIBILITY_LABEL[initial.visibility]}
            </span>
          </div>
          {initial.description && (
            <p className="text-sm text-neutral-500">{initial.description}</p>
          )}
          <p className="text-xs text-neutral-400 mt-1">
            Por {initial.createdBy.name} · {nuggets.length} nuggets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); toast.info("Link copiado!"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Share2 size={12} /> Compartilhar
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
              <Download size={12} /> Exportar
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-xl shadow-lg hidden group-hover:block z-20">
              {(["pdf", "markdown", "csv"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                >
                  {fmt === "pdf" ? "PDF (imprimir)" : fmt === "markdown" ? "Markdown" : "CSV"}
                </button>
              ))}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Plus size={12} /> Adicionar nuggets
            </button>
          )}
        </div>
      </div>

      {/* Share URL */}
      <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
        <ExternalLink size={12} className="text-neutral-400" />
        <span className="text-xs text-neutral-500 flex-1 truncate">{shareUrl}</span>
        <a href={`/share/collections/${initial.id}`} target="_blank" rel="noopener" className="text-xs text-brand-600 hover:underline">Abrir</a>
      </div>

      {/* Nugget list */}
      {nuggets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-semibold text-neutral-700 mb-1">Nenhum nugget nesta coleção</p>
          <p className="text-sm text-neutral-400">Adicione nuggets para começar.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="nuggets">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {nuggets.map((cn, index) => (
                  <Draggable key={cn.nuggetId} draggableId={cn.nuggetId} index={index} isDragDisabled={!canEdit}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`flex items-start gap-3 bg-white border rounded-xl p-4 transition-shadow ${snapshot.isDragging ? "shadow-lg border-brand-300" : "border-neutral-200"}`}
                      >
                        {canEdit && (
                          <div {...drag.dragHandleProps} className="mt-0.5 text-neutral-300 hover:text-neutral-500 cursor-grab">
                            <GripVertical size={16} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <TypeBadge type={cn.nugget.type} />
                            <span className="text-xs text-neutral-300">·</span>
                            <span className="text-xs text-neutral-400 truncate max-w-[160px]">{cn.nugget.source.title}</span>
                          </div>
                          <Link href={`/app/nuggets/${cn.nugget.id}`} className="block">
                            <p className="text-sm text-neutral-800 line-clamp-3 hover:text-brand-600 transition-colors">
                              {cn.nugget.content}
                            </p>
                          </Link>
                          {cn.nugget.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {cn.nugget.tags.slice(0, 3).map(({ tag }) => <TagPill key={tag.id} tag={tag} />)}
                            </div>
                          )}
                          <p className="text-xs text-neutral-400 mt-2">
                            Adicionado por {cn.addedBy.name} · {formatRelativeTime(cn.addedAt)}
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleRemove(cn.nuggetId)}
                            className="text-neutral-300 hover:text-error-500 transition-colors mt-0.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">Adicionar nuggets</h2>
              <button onClick={() => { setShowAddModal(false); setSelectedIds([]); setSearchResults([]); setSearchQ(""); }} className="text-neutral-400 hover:text-neutral-600">✕</button>
            </div>
            <div className="px-6 py-4">
              <input
                value={searchQ}
                onChange={(e) => searchNuggets(e.target.value)}
                placeholder="Buscar nuggets..."
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-400 mb-3"
                autoFocus
              />
              {searching && <p className="text-xs text-neutral-400 text-center py-4">Buscando...</p>}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((n) => (
                  <label key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(n.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked ? [...prev, n.id] : prev.filter((id) => id !== n.id)
                        )
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: n.type.color }} />
                        <span className="text-xs font-medium text-neutral-500">{n.type.name}</span>
                      </div>
                      <p className="text-sm text-neutral-800 line-clamp-2">{n.content}</p>
                    </div>
                  </label>
                ))}
                {!searching && searchQ && searchResults.length === 0 && (
                  <p className="text-xs text-neutral-400 text-center py-4">Nenhum resultado encontrado.</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-2">
              <button
                onClick={() => { setShowAddModal(false); setSelectedIds([]); }}
                className="px-4 py-2 text-sm border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={selectedIds.length === 0 || adding}
                className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {adding ? "Adicionando..." : `Adicionar (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
