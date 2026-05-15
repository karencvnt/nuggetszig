import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const schema = z.object({
  code: z.string().min(1).optional(),
  segmentId: z.string().uuid().optional().nullable(),
  persona: z.string().optional().nullable(),
  usageProfile: z.string().optional().nullable(),
  timeAsClient: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      segment: true,
      sources: {
        include: {
          source: {
            include: { method: { select: { name: true, category: true } } },
          },
        },
      },
      nuggets: {
        where: { deletedAt: null },
        include: { type: { select: { name: true, color: true, icon: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!participant) return NextResponse.json({ error: "Participante não encontrado." }, { status: 404 });
  return NextResponse.json(participant);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const participant = await prisma.participant.findUnique({ where: { id } });
  if (!participant) return NextResponse.json({ error: "Participante não encontrado." }, { status: 404 });

  if (participant.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas o criador ou admins podem editar este participante." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  if (parsed.data.code && parsed.data.code !== participant.code) {
    const exists = await prisma.participant.findUnique({ where: { code: parsed.data.code } });
    if (exists) return NextResponse.json({ error: `Código "${parsed.data.code}" já está em uso.` }, { status: 409 });
  }

  const updated = await prisma.participant.update({
    where: { id },
    data: parsed.data,
    include: { segment: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}
