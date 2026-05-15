import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import NuggetDetailClient from "./nugget-detail-client";

export default async function NuggetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [nugget, nuggetTypes, journeys, tags, sources] = await Promise.all([
    prisma.nugget.findUnique({
      where: { id, deletedAt: null },
      include: {
        type: true,
        source: {
          select: {
            id: true,
            title: true,
            participants: { include: { participant: { select: { id: true, code: true } } } },
          },
        },
        participant: { select: { id: true, code: true } },
        journey: { select: { id: true, name: true, stages: true } },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true } },
        relationsFrom: {
          include: {
            toNugget: {
              select: {
                id: true,
                content: true,
                type: { select: { name: true, color: true } },
                status: true,
              },
            },
          },
        },
        relationsTo: {
          include: {
            fromNugget: {
              select: {
                id: true,
                content: true,
                type: { select: { name: true, color: true } },
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.nuggetType.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.journey.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, stages: true },
    }),
    prisma.tag.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true, category: true },
    }),
    prisma.source.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!nugget) notFound();

  const canEdit =
    session.user.role === "ADMIN" || nugget.createdById === session.user.id;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <nav className="text-sm text-neutral-400 mb-6 flex items-center gap-2">
        <Link href="/app/nuggets" className="hover:text-neutral-600">
          Repositório
        </Link>
        <span>/</span>
        <span className="text-neutral-600 font-medium line-clamp-1 max-w-xs">
          {nugget.content.slice(0, 60)}…
        </span>
      </nav>

      <NuggetDetailClient
        nugget={nugget}
        nuggetTypes={nuggetTypes}
        journeys={journeys}
        allTags={tags}
        sources={sources}
        canEdit={canEdit}
      />
    </div>
  );
}
