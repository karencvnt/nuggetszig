import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

const SENTIMENT_LABEL: Record<string, string> = { POSITIVE: "😊 Positivo", NEUTRAL: "😐 Neutro", NEGATIVE: "😞 Negativo" };
const IMPACT_LABEL: Record<string, string> = { LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto", CRITICAL: "Crítico" };
const STATUS_LABEL: Record<string, string> = { NEW: "Novo", VALIDATED: "Validado", INVESTIGATING: "Investigando", DISCARDED: "Descartado", ADDRESSED: "Tratado" };
const VISIBILITY_LABEL: Record<string, string> = { PRIVATE: "Privada", TEAM: "Time", COMPANY: "Empresa" };

export default async function SharedCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      nuggets: {
        orderBy: { order: "asc" },
        include: {
          nugget: {
            include: {
              type: true,
              source: { select: { title: true } },
              tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
              createdBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!collection || collection.visibility === "PRIVATE") notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-neutral-900">{collection.title}</h1>
          <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">
            {VISIBILITY_LABEL[collection.visibility]}
          </span>
        </div>
        {collection.description && (
          <p className="text-sm text-neutral-500 mb-1">{collection.description}</p>
        )}
        <p className="text-xs text-neutral-400">
          Por {collection.createdBy.name} · {collection.nuggets.length} nuggets · Exportado em {formatDate(new Date())}
        </p>
      </div>

      <div className="space-y-4">
        {collection.nuggets.map(({ nugget }, i) => (
          <div key={nugget.id} className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${nugget.type.color}20`, color: nugget.type.color }}
              >
                {nugget.type.name}
              </span>
              <span className="text-xs text-neutral-400">#{i + 1}</span>
            </div>
            <p className="text-sm text-neutral-800 leading-relaxed mb-3">{nugget.content}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {nugget.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="text-xs text-neutral-400 space-x-3">
              <span>Fonte: {nugget.source.title}</span>
              {nugget.sentiment && <span>{SENTIMENT_LABEL[nugget.sentiment]}</span>}
              {nugget.impact && <span>Impacto: {IMPACT_LABEL[nugget.impact]}</span>}
              <span>Status: {STATUS_LABEL[nugget.status] ?? nugget.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-400">
        Gerado pela plataforma Nuggets · {formatDate(new Date())}
      </div>
    </div>
  );
}
