import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; nuggetId: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id: collectionId, nuggetId } = await params;
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return NextResponse.json({ error: "Coleção não encontrada." }, { status: 404 });

  if (collection.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão para editar esta coleção." }, { status: 403 });
  }

  await prisma.collectionNugget.delete({
    where: { collectionId_nuggetId: { collectionId, nuggetId } },
  });

  return NextResponse.json({ ok: true });
}
