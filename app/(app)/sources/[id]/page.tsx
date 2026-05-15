import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import SourceDetailClient from "./source-detail-client";

const STATUS_LABELS: Record<string, string> = { DRAFT: "Rascunho", ACTIVE: "Ativa", ARCHIVED: "Arquivada" };
const STATUS_VARIANTS: Record<string, "neutral" | "success" | "default"> = {
  DRAFT: "neutral", ACTIVE: "success", ARCHIVED: "default",
};

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [source, segments] = await Promise.all([
    prisma.source.findUnique({
      where: { id },
      include: {
        method: true,
        createdBy: { select: { id: true, name: true } },
        participants: {
          include: {
            participant: { include: { segment: { select: { name: true } } } },
          },
          orderBy: { participant: { code: "asc" } },
        },
        nuggets: {
          where: { deletedAt: null },
          include: { type: { select: { name: true, color: true, icon: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { nuggets: true } },
      },
    }),
    prisma.segment.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!source) notFound();

  const canEdit =
    session.user.role === "ADMIN" || source.createdById === session.user.id;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-neutral-400 mb-6 flex items-center gap-2">
        <Link href="/app/sources" className="hover:text-neutral-600">Fontes</Link>
        <span>/</span>
        <span className="text-neutral-700 font-medium">{source.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-neutral-900">{source.title}</h1>
            <Badge variant={STATUS_VARIANTS[source.status]}>{STATUS_LABELS[source.status]}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
            <span className="font-medium text-neutral-700">{source.method.name}</span>
            {source.squad && <span>Squad: {source.squad}</span>}
            {source.startDate && (
              <span>
                {formatDate(source.startDate)}
                {source.endDate ? ` → ${formatDate(source.endDate)}` : ""}
              </span>
            )}
            <span>por {source.createdBy.name}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/app/sources/${id}/edit`}
              className="px-3 py-2 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Editar
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main content */}
        <div className="col-span-2 space-y-8">
          {/* Description */}
          {(source.description || source.objective) && (
            <section>
              {source.description && (
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Descrição</h2>
                  <p className="text-neutral-700 text-sm leading-relaxed">{source.description}</p>
                </div>
              )}
              {source.objective && (
                <div>
                  <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Objetivo</h2>
                  <p className="text-neutral-700 text-sm leading-relaxed">{source.objective}</p>
                </div>
              )}
            </section>
          )}

          {/* Participants section */}
          <SourceDetailClient
            sourceId={id}
            initialParticipants={source.participants.map((sp) => sp.participant)}
            segments={segments}
            canEdit={canEdit}
          />

          {/* Nuggets preview */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-neutral-900">
                Nuggets gerados <span className="text-neutral-400 font-normal">({source._count.nuggets})</span>
              </h2>
              {source._count.nuggets > 0 && (
                <Link href={`/app?sourceId=${id}`} className="text-sm text-brand-600 hover:text-brand-700">
                  Ver todos →
                </Link>
              )}
            </div>
            {source.nuggets.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">Nenhum nugget criado a partir desta fonte ainda.</p>
            ) : (
              <div className="space-y-2">
                {source.nuggets.map((n) => (
                  <Link
                    key={n.id}
                    href={`/app/nuggets/${n.id}`}
                    className="block p-3 border border-neutral-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: n.type.color }}
                      />
                      <span className="text-xs font-medium text-neutral-500">{n.type.name}</span>
                    </div>
                    <p className="text-sm text-neutral-700 line-clamp-2">{n.content}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar metadata */}
        <aside className="space-y-4">
          <MetaCard>
            <MetaRow label="Método" value={source.method.name} />
            <MetaRow label="Categoria" value={source.method.category} />
            {source.squad && <MetaRow label="Squad" value={source.squad} />}
            {source.participantCount && <MetaRow label="Participantes previstos" value={source.participantCount.toString()} />}
            {source.artifactUrl && (
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Artefato</p>
                <a href={source.artifactUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 break-all">
                  Abrir link →
                </a>
              </div>
            )}
          </MetaCard>
        </aside>
      </div>
    </div>
  );
}

function MetaCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">{children}</div>;
}
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="text-sm text-neutral-800 mt-0.5 capitalize">{value}</p>
    </div>
  );
}
