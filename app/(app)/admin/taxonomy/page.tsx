import { prisma } from "@/lib/prisma";
import TaxonomyClient from "./taxonomy-client";

async function getData() {
  const [nuggetTypes, tags, journeys, methods, segments] = await Promise.all([
    prisma.nuggetType.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { nuggets: true } } },
    }),
    prisma.tag.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { _count: { select: { nuggets: true } } },
    }),
    prisma.journey.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { nuggets: true } } },
    }),
    prisma.researchMethod.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { _count: { select: { sources: true } } },
    }),
    prisma.segment.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { participants: true } } },
    }),
  ]);

  return {
    nuggetTypes: nuggetTypes.map((t) => ({ ...t, _count: t._count.nuggets })),
    tags: tags.map((t) => ({ ...t, _count: t._count.nuggets })),
    journeys: journeys.map((j) => ({ ...j, stages: j.stages as string[], _count: j._count.nuggets })),
    methods: methods.map((m) => ({ ...m, _count: m._count.sources })),
    segments: segments.map((s) => ({ ...s, _count: s._count.participants })),
  };
}

export default async function TaxonomyPage() {
  const data = await getData();
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900">Taxonomia</h1>
        <p className="text-sm text-neutral-500 mt-1">Gerencie os tipos, tags, jornadas, métodos e segmentos da plataforma.</p>
      </div>
      <TaxonomyClient initialData={data} />
    </>
  );
}
