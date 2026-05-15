import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id: collectionId } = await params;
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return NextResponse.json({ error: "Coleção não encontrada." }, { status: 404 });

  if (collection.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão para editar esta coleção." }, { status: 403 });
  }

  const { nuggetIds } = await req.json() as { nuggetIds: string[] };
  if (!Array.isArray(nuggetIds) || nuggetIds.length === 0) {
    return NextResponse.json({ error: "Nenhum nugget selecionado." }, { status: 400 });
  }

  const existing = await prisma.collectionNugget.findMany({
    where: { collectionId },
    select: { order: true },
    orderBy: { order: "desc" },
  });
  let nextOrder = (existing[0]?.order ?? -1) + 1;

  const toAdd = nuggetIds.filter((nid) => !existing.find((e) => (e as { nuggetId?: string }).nuggetId === nid));

  await prisma.collectionNugget.createMany({
    data: nuggetIds.map((nuggetId) => ({
      collectionId,
      nuggetId,
      addedById: session!.user.id,
      order: nextOrder++,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ added: nuggetIds.length });
}
