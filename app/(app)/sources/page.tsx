import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = { DRAFT: "Rascunho", ACTIVE: "Ativa", ARCHIVED: "Arquivada" };
const STATUS_VARIANTS: Record<string, "neutral" | "success" | "default"> = {
  DRAFT: "neutral", ACTIVE: "success", ARCHIVED: "default",
};
const CATEGORY_LABELS: Record<string, string> = {
  qualitativo: "Qualitativo", quantitativo: "Quantitativo", "desk research": "Desk Research",
};

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; methodId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { status, methodId } = await searchParams;

  const [sources, methods] = await Promise.all([
    prisma.source.findMany({
      where: {
        ...(status && { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" }),
        ...(methodId && { methodId }),
      },
      include: {
        method: { select: { id: true, name: true, category: true } },
        createdBy: { select: { name: true } },
        _count: { select: { nuggets: true, participants: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.researchMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const canCreate = session.user.role !== "VIEWER";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Fontes de pesquisa</h1>
          <p className="text-sm text-neutral-500 mt-1">{sources.length} fonte{sources.length !== 1 ? "s" : ""}</p>
        </div>
        {canCreate && (
          <Link
            href="/app/sources/new"
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} /> Nova fonte
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <FilterSelect name="status" label="Status">
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="ACTIVE">Ativa</option>
          <option value="ARCHIVED">Arquivada</option>
        </FilterSelect>
        <FilterSelect name="methodId" label="Método">
          <option value="">Todos os métodos</option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </FilterSelect>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <p className="text-lg font-medium text-neutral-500 mb-2">Nenhuma fonte encontrada</p>
          {canCreate && (
            <Link href="/app/sources/new" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
              Criar primeira fonte →
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
                <th className="px-4 py-3 font-medium text-neutral-500">Título</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Método</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Squad</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Período</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-right">Nuggets</th>
                <th className="px-4 py-3 font-medium text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/app/sources/${s.id}`} className="font-medium text-neutral-800 hover:text-brand-700">
                      {s.title}
                    </Link>
                    <p className="text-xs text-neutral-400 mt-0.5">por {s.createdBy.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-neutral-700">{s.method.name}</p>
                      <p className="text-xs text-neutral-400">{CATEGORY_LABELS[s.method.category]}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{s.squad ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {s.startDate ? formatDate(s.startDate) : "—"}
                    {s.endDate ? ` → ${formatDate(s.endDate)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600 font-medium">{s._count.nuggets}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
