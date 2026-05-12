import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const linkSchema = z.object({ participantId: z.string().uuid() });

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id: sourceId } = await params;
  const body = await req.json();

  // Support linking existing participant or creating new one inline
  if (body.participantId) {
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const existing = await prisma.sourceParticipant.findUnique({
      where: { sourceId_participantId: { sourceId, participantId: parsed.data.participantId } },
    });
    if (existing) return NextResponse.json({ error: "Participante já vinculado a esta fonte." }, { status: 409 });

    const link = await prisma.sourceParticipant.create({
      data: { sourceId, participantId: parsed.data.participantId },
      include: { participant: { include: { segment: { select: { name: true } } } } },
    });
    return NextResponse.json(link, { status: 201 });
  }

  // Create new participant inline
  const newSchema = z.object({
    code: z.string().min(1),
    segmentId: z.string().uuid().optional().nullable(),
    persona: z.string().optional().nullable(),
    usageProfile: z.string().optional().nullable(),
    timeAsClient: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  });

  const parsed = newSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const participant = await prisma.participant.create({
    data: { ...parsed.data, createdById: session!.user.id },
  });

  await prisma.sourceParticipant.create({ data: { sourceId, participantId: participant.id } });

  return NextResponse.json(participant, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id: sourceId } = await params;
  const { participantId } = await req.json();

  await prisma.sourceParticipant.delete({
    where: { sourceId_participantId: { sourceId, participantId } },
  });

  return NextResponse.json({ message: "Participante desvinculado." });
}
