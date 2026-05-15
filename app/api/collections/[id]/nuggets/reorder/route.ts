import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id: collectionId } = await params;
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return NextResponse.json({ error: "Coleção não encontrada." }, { status: 404 });

  if (collection.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { orderedIds } = await req.json() as { orderedIds: string[] };

  await prisma.$transaction(
    orderedIds.map((nuggetId, index) =>
      prisma.collectionNugget.update({
        where: { collectionId_nuggetId: { collectionId, nuggetId } },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
