import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import CollectionDetailClient from "./collection-detail-client";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      nuggets: {
        orderBy: { order: "asc" },
        include: {
          nugget: {
            include: {
              type: true,
              source: { select: { id: true, title: true } },
              tags: { include: { tag: true } },
              createdBy: { select: { name: true } },
            },
          },
          addedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!collection) notFound();

  const canEdit =
    collection.createdById === session.user.id || session.user.role === "ADMIN";

  return (
    <CollectionDetailClient
      collection={collection}
      userId={session.user.id}
      canEdit={canEdit}
    />
  );
}
