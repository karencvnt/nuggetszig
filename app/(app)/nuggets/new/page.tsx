import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NuggetForm from "../nugget-form";

export default async function NewNuggetPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "VIEWER") redirect("/app/nuggets");

  const [nuggetTypes, sources, journeys, tags] = await Promise.all([
    prisma.nuggetType.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.source.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
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
  ]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-neutral-900 mb-6">Novo nugget</h1>
      <NuggetForm nuggetTypes={nuggetTypes} sources={sources} journeys={journeys} allTags={tags} />
    </div>
  );
}
