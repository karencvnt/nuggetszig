import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ParticipantEditClient from "./participant-edit-client";

export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [participant, segments] = await Promise.all([
    prisma.participant.findUnique({
      where: { id },
      include: {
        segment: true,
        sources: {
          include: {
            source: {
              include: { method: { select: { name: true, category: true } } },
            },
          },
        },
        nuggets: {
          where: { deletedAt: null },
          include: { type: { select: { name: true, color: true } }, source: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    }),
    prisma.segment.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!participant) notFound();

  const canEdit =
    session.user.role === "ADMIN" || participant.createdById === session.user.id;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <nav className="text-sm text-neutral-400 mb-6 flex items-center gap-2">
        <Link href="/app/participants" className="hover:text-neutral-600">Participantes</Link>
        <span>/</span>
        <span className="font-mono text-neutral-700 font-medium">{participant.code}</span>
      </nav>

      <div className="grid grid-cols-3 gap-8">
        {/* Profile card */}
        <aside className="col-span-1">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center font-mono text-lg font-bold text-neutral-500">
                {participant.code.slice(0, 2)}
              </div>
              <div>
                <p className="font-mono font-bold text-neutral-900">{participant.code}</p>
                {participant.segment && (
                  <Badge variant="default" className="mt-1">{participant.segment.name}</Badge>
                )}
              </div>
            </div>

            {canEdit && (
              <ParticipantEditClient participant={participant} segments={segments} />
            )}

            <div className="space-y-3 pt-2 border-t border-neutral-100">
              {participant.persona && <MetaRow label="Persona" value={participant.persona} />}
              {participant.usageProfile && <MetaRow label="Perfil de uso" value={participant.usageProfile} />}
              {participant.timeAsClient && <MetaRow label="Tempo como cliente" value={participant.timeAsClient} />}
              {participant.region && <MetaRow label="Região" value={participant.region} />}
              {participant.notes && <MetaRow label="Notas" value={participant.notes} />}
            </div>
          </div>
        </aside>

        {/* History */}
        <div className="col-span-2 space-y-8">
          {/* Sources */}
          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-3">
              Fontes participadas <span className="text-neutral-400 font-normal">({participant.sources.length})</span>
            </h2>
            {participant.sources.length === 0 ? (
              <p className="text-sm text-neutral-400">Nenhuma fonte ainda.</p>
            ) : (
              <div className="space-y-2">
                {participant.sources.map(({ source }) => (
                  <Link
                    key={source.id}
                    href={`/app/sources/${source.id}`}
                    className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-neutral-800 text-sm">{source.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{source.method.name}</p>
                    </div>
                    <span className="text-xs text-neutral-400">{formatDate(source.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Nuggets */}
          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-3">
              Nuggets gerados <span className="text-neutral-400 font-normal">({participant.nuggets.length})</span>
            </h2>
            {participant.nuggets.length === 0 ? (
              <p className="text-sm text-neutral-400">Nenhum nugget vinculado ainda.</p>
            ) : (
              <div className="space-y-2">
                {participant.nuggets.map((n) => (
                  <Link
                    key={n.id}
                    href={`/app/nuggets/${n.id}`}
                    className="block p-3 border border-neutral-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: n.type.color }} />
                      <span className="text-xs font-medium text-neutral-500">{n.type.name}</span>
                      <span className="text-xs text-neutral-300 ml-auto">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-neutral-700 line-clamp-2">{n.content}</p>
                    <p className="text-xs text-neutral-400 mt-1">{n.source.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p className="text-sm text-neutral-700 mt-0.5">{value}</p>
    </div>
  );
}
