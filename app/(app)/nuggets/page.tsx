import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NuggetsClient from "./nuggets-client";
import { buildNuggetWhere, buildNuggetOrderBy, NUGGET_INCLUDE } from "@/app/api/nuggets/route";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NuggetsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const raw = await searchParams;
  const sp = new URLSearchParams(
    Object.fromEntries(
      Object.entries(raw)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : (v as string)])
    )
  );

  const where = buildNuggetWhere(sp);
  const orderBy = buildNuggetOrderBy(sp);

  const [initialItems, initialTotal, nuggetTypes, journeys, segments, allTags, users] =
    await Promise.all([
      prisma.nugget.findMany({ where, include: NUGGET_INCLUDE, orderBy, take: 50 }),
      prisma.nugget.count({ where }),
      prisma.nuggetType.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      prisma.journey.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true, stages: true },
      }),
      prisma.segment.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.tag.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        select: { id: true, name: true, color: true, category: true },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const initialFilters = {
    q: sp.get("q") ?? "",
    types: sp.get("type")?.split(",").filter(Boolean) ?? [],
    statuses: sp.get("status")?.split(",").filter(Boolean) ?? [],
    sentiments: sp.get("sentiment")?.split(",").filter(Boolean) ?? [],
    journeyId: sp.get("journey") ?? "",
    stage: sp.get("stage") ?? "",
    segments: sp.get("segment")?.split(",").filter(Boolean) ?? [],
    tagIds: sp.get("tags")?.split(",").filter(Boolean) ?? [],
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
    squad: sp.get("squad") ?? "",
    createdBy: sp.get("createdBy") ?? "",
    sortBy: sp.get("sortBy") ?? "createdAt_desc",
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <NuggetsClient
        initialItems={initialItems}
        initialTotal={initialTotal}
        initialFilters={initialFilters}
        nuggetTypes={nuggetTypes}
        journeys={journeys}
        segments={segments}
        allTags={allTags}
        users={users}
        canCreate={session.user.role !== "VIEWER"}
      />
    </div>
  );
}
