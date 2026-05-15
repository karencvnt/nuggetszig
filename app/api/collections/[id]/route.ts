import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const COLLECTION_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  nuggets: {
    orderBy: { order: "asc" as const },
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
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id }, include: COLLECTION_INCLUDE });

  if (!collection) return NextResponse.json({ error: "Coleção não encontrada." }, { status: 404 });
  return NextResponse.json(collection);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return NextResponse.json({ error: "Coleção não encontrada." }, { status: 404 });

  if (collection.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão para editar esta coleção." }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, context, visibility } = body;

  const updated = await prisma.collection.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(context !== undefined && { context: context?.trim() || null }),
      ...(visibility !== undefined && { visibility }),
    },
    include: COLLECTION_INCLUDE,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return NextResponse.json({ error: "Coleção não encontrada." }, { status: 404 });

  if (collection.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão para excluir esta coleção." }, { status: 403 });
  }

  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
