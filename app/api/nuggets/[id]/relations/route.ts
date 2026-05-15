import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const schema = z.object({
  toNuggetId: z.string().uuid(),
  relationType: z.enum(["COMPLEMENTS", "CONTRADICTS", "DEEPENS"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const nugget = await prisma.nugget.findUnique({ where: { id, deletedAt: null } });
  if (!nugget) return NextResponse.json({ error: "Nugget não encontrado." }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (id === parsed.data.toNuggetId) {
    return NextResponse.json({ error: "Um nugget não pode se relacionar consigo mesmo." }, { status: 400 });
  }

  const toNugget = await prisma.nugget.findUnique({ where: { id: parsed.data.toNuggetId, deletedAt: null } });
  if (!toNugget) return NextResponse.json({ error: "Nugget de destino não encontrado." }, { status: 404 });

  const existing = await prisma.nuggetRelation.findFirst({
    where: {
      OR: [
        { fromNuggetId: id, toNuggetId: parsed.data.toNuggetId },
        { fromNuggetId: parsed.data.toNuggetId, toNuggetId: id },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "Relação já existe." }, { status: 409 });

  const relation = await prisma.nuggetRelation.create({
    data: {
      fromNuggetId: id,
      toNuggetId: parsed.data.toNuggetId,
      relationType: parsed.data.relationType,
    },
    include: {
      toNugget: {
        select: { id: true, content: true, type: { select: { name: true, color: true } }, status: true },
      },
    },
  });

  return NextResponse.json(relation, { status: 201 });
}
