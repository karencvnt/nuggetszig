import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CollectionsClient from "./collections-client";

export default async function CollectionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [myCollections, teamCollections] = await Promise.all([
    prisma.collection.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { nuggets: true } },
      },
    }),
    prisma.collection.findMany({
      where: {
        visibility: { in: ["TEAM", "COMPANY"] },
        createdById: { not: session.user.id },
      },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { nuggets: true } },
      },
    }),
  ]);

  return (
    <CollectionsClient
      myCollections={myCollections}
      teamCollections={teamCollections}
      userId={session.user.id}
      canCreate={session.user.role !== "VIEWER"}
    />
  );
}
