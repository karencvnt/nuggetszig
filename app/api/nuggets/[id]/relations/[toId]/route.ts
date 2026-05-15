import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string; toId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id, toId } = await params;

  const relation = await prisma.nuggetRelation.findFirst({
    where: {
      OR: [
        { fromNuggetId: id, toNuggetId: toId },
        { fromNuggetId: toId, toNuggetId: id },
      ],
    },
  });

  if (!relation) return NextResponse.json({ error: "Relação não encontrada." }, { status: 404 });

  await prisma.nuggetRelation.delete({
    where: {
      fromNuggetId_toNuggetId: { fromNuggetId: relation.fromNuggetId, toNuggetId: relation.toNuggetId },
    },
  });

  return NextResponse.json({ message: "Relação removida." });
}
