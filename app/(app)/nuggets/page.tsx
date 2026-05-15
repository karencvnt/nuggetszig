import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  VALIDATED: "Validado",
  INVESTIGATING: "Investigando",
  DISCARDED: "Descartado",
  ADDRESSED: "Tratado",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-neutral-100 text-neutral-600",
  VALIDATED: "bg-success-50 text-success-700",
  INVESTIGATING: "bg-warning-50 text-warning-700",
  DISCARDED: "bg-neutral-100 text-neutral-400",
  ADDRESSED: "bg-brand-50 text-brand-700",
};

export default async function NuggetsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const nuggets = await prisma.nugget.findMany({
    where: { deletedAt: null },
    include: {
      type: { select: { id: true, name: true, color: true } },
      source: { select: { id: true, title: true } },
      participant: { select: { id: true, code: true } },
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const canCreate = session.user.role !== "VIEWER";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Repositório</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {nuggets.length} nugget{nuggets.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/app/nuggets/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} /> Novo nugget
          </Link>
        )}
      </div>

      {nuggets.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-lg font-medium mb-2">Nenhum nugget ainda</p>
          {canCreate && (
            <Link href="/app/nuggets/new" className="text-sm text-brand-600 hover:underline">
              Crie o primeiro nugget
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {nuggets.map((n) => (
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
                    <span className="text-xs text-neutral-400 truncate max-w-[200px]">{n.source.title}</span>
                    {n.participant && (
                      <>
                        <span className="text-xs text-neutral-300">·</span>
                        <span className="text-xs font-mono text-neutral-400">{n.participant.code}</span>
                      </>
                    )}
                    <span
                      className={`ml-auto px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[n.status] ?? "bg-neutral-100 text-neutral-500"}`}
                    >
                      {STATUS_LABELS[n.status] ?? n.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-800 line-clamp-2">{n.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {n.tags.slice(0, 4).map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-600"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </span>
                        ))}
                        {n.tags.length > 4 && (
                          <span className="text-xs text-neutral-400">+{n.tags.length - 4}</span>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-neutral-400 ml-auto">{formatRelativeTime(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
