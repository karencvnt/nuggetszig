"use client";

import { useState } from "react";
import { Pencil, Power, GripVertical, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { getIcon } from "@/components/admin/icon-picker";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export type EntityRow = {
  id: string;
  name: string;
  isActive: boolean;
  color?: string | null;
  icon?: string | null;
  category?: string | null;
  description?: string | null;
  order?: number;
  _count?: number;
};

interface EntityTableProps {
  rows: EntityRow[];
  onEdit: (row: EntityRow) => void;
  onToggleActive: (row: EntityRow) => void;
  onReorder?: (ids: string[]) => void;
  showColor?: boolean;
  showIcon?: boolean;
  showCategory?: boolean;
  linkedLabel?: string;
}

type StatusFilter = "all" | "active" | "inactive";

export function EntityTable({
  rows,
  onEdit,
  onToggleActive,
  onReorder,
  showColor,
  showIcon,
  showCategory,
  linkedLabel = "vinculados",
}: EntityTableProps) {
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [deactivateTarget, setDeactivateTarget] = useState<EntityRow | null>(null);
  const [localRows, setLocalRows] = useState(rows);

  const filtered = localRows.filter((r) => {
    if (filter === "active") return r.isActive;
    if (filter === "inactive") return !r.isActive;
    return true;
  });

  function handleDragEnd(result: DropResult) {
    if (!result.destination || !onReorder) return;
    const reordered = Array.from(localRows);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLocalRows(reordered);
    onReorder(reordered.map((r) => r.id));
  }

  function confirmToggle(row: EntityRow) {
    if (row.isActive) {
      setDeactivateTarget(row);
    } else {
      onToggleActive(row);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        {(["active", "inactive", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {s === "active" ? "Ativos" : s === "inactive" ? "Inativos" : "Todos"}
          </button>
        ))}
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="entities">
            {(provided) => (
              <table className="w-full text-sm" ref={provided.innerRef} {...provided.droppableProps}>
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    {onReorder && <th className="w-8" />}
                    {showColor && <th className="w-10" />}
                    <th className="text-left px-4 py-3 font-medium text-neutral-500">Nome</th>
                    {showCategory && <th className="text-left px-4 py-3 font-medium text-neutral-500">Categoria</th>}
                    <th className="text-left px-4 py-3 font-medium text-neutral-500">Status</th>
                    {linkedLabel && <th className="text-right px-4 py-3 font-medium text-neutral-500">{linkedLabel}</th>}
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-neutral-400">
                        Nenhum item encontrado.
                      </td>
                    </tr>
                  )}
                  {filtered.map((row, index) => {
                    const IconComp = row.icon ? getIcon(row.icon) : null;
                    return (
                      <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={!onReorder}>
                        {(drag) => (
                          <tr
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={`border-b border-neutral-100 last:border-0 transition-opacity ${
                              !row.isActive ? "opacity-50" : ""
                            }`}
                          >
                            {onReorder && (
                              <td className="px-2 py-3">
                                <span {...drag.dragHandleProps} className="text-neutral-300 hover:text-neutral-500 cursor-grab">
                                  <GripVertical size={16} />
                                </span>
                              </td>
                            )}
                            {showColor && (
                              <td className="px-2 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-5 h-5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: row.color ?? "#e5e7eb" }}
                                  />
                                  {showIcon && IconComp && (
                                    <span className="text-neutral-500"><IconComp size={14} /></span>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-3 font-medium text-neutral-800">
                              {row.name}
                              {!row.isActive && <Badge variant="neutral" className="ml-2">Inativo</Badge>}
                            </td>
                            {showCategory && (
                              <td className="px-4 py-3 text-neutral-500">{row.category}</td>
                            )}
                            <td className="px-4 py-3">
                              <Badge variant={row.isActive ? "success" : "neutral"}>
                                {row.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </td>
                            {linkedLabel !== undefined && (
                              <td className="px-4 py-3 text-right text-neutral-500">
                                {row._count ?? "—"}
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => onEdit(row)}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => confirmToggle(row)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    row.isActive
                                      ? "text-neutral-400 hover:text-error-600 hover:bg-error-50"
                                      : "text-neutral-400 hover:text-success-600 hover:bg-success-50"
                                  }`}
                                  title={row.isActive ? "Desativar" : "Reativar"}
                                >
                                  <Power size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Deactivation confirmation modal */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Desativar item"
      >
        {deactivateTarget && (
          <div>
            <p className="text-neutral-600 mb-4">
              Você está prestes a desativar <strong>{deactivateTarget.name}</strong>.
            </p>
            {(deactivateTarget._count ?? 0) > 0 && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-4 text-sm text-warning-700">
                Este item possui <strong>{deactivateTarget._count} {linkedLabel}</strong>.
              </div>
            )}
            <p className="text-sm text-neutral-500 mb-6">
              Este item não será excluído. Ele ficará oculto em novos cadastros, mas permanecerá nos registros históricos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivateTarget(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onToggleActive(deactivateTarget); setDeactivateTarget(null); }}
                className="px-4 py-2 text-sm font-semibold bg-error-600 text-white hover:bg-error-700 rounded-lg transition-colors"
              >
                Desativar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

interface AddButtonProps {
  onClick: () => void;
  label: string;
}

export function AddButton({ onClick, label }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
    >
      <Plus size={16} />
      {label}
    </button>
  );
}
