import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { calculateCompletenessScore } from "@/lib/utils";

const updateSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  typeId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional().nullable(),
  journeyId: z.string().uuid().optional().nullable(),
  journeyStage: z.string().optional().nullable(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional().nullable(),
  impact: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().nullable(),
  status: z.enum(["NEW", "VALIDATED", "INVESTIGATING", "DISCARDED", "ADDRESSED"]).optional(),
  evidenceUrl: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

type Params = { params: Promise<{ id: string }> };

const nuggetInclude = {
  type: true,
  source: {
    select: {
      id: true,
      title: true,
      participants: { include: { participant: { select: { id: true, code: true } } } },
    },
  },
  participant: { select: { id: true, code: true } },
  journey: { select: { id: true, name: true, stages: true } },
  tags: { include: { tag: true } },
  createdBy: { select: { id: true, name: true } },
  relationsFrom: {
    include: {
      toNugget: {
        select: { id: true, content: true, type: { select: { name: true, color: true } }, status: true },
      },
    },
  },
  relationsTo: {
    include: {
      fromNugget: {
        select: { id: true, content: true, type: { select: { name: true, color: true } }, status: true },
      },
    },
  },
} as const;

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const nugget = await prisma.nugget.findUnique({ where: { id, deletedAt: null }, include: nuggetInclude });

  if (!nugget) return NextResponse.json({ error: "Nugget não encontrado." }, { status: 404 });
  return NextResponse.json(nugget);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const nugget = await prisma.nugget.findUnique({ where: { id, deletedAt: null } });
  if (!nugget) return NextResponse.json({ error: "Nugget não encontrado." }, { status: 404 });

  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  if (nugget.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas o criador ou admins podem editar este nugget." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { tagIds, evidenceUrl, ...data } = parsed.data;

  let tagsForScore: string[];
  if (tagIds !== undefined) {
    tagsForScore = tagIds;
  } else {
    const existingTags = await prisma.nuggetTag.findMany({ where: { nuggetId: id } });
    tagsForScore = existingTags.map((t) => t.tagId);
  }

  const merged = { ...nugget, ...data };
  const completenessScore = calculateCompletenessScore({
    typeId: merged.typeId,
    sourceId: merged.sourceId,
    journeyId: merged.journeyId,
    tags: tagsForScore,
    sentiment: merged.sentiment,
    impact: merged.impact,
    evidenceUrl: evidenceUrl !== undefined ? (evidenceUrl || null) : nugget.evidenceUrl,
  });

  const updated = await prisma.nugget.update({
    where: { id },
    data: {
      ...data,
      ...(evidenceUrl !== undefined && { evidenceUrl: evidenceUrl || null }),
      completenessScore,
      ...(tagIds !== undefined && {
        tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
      }),
    },
    include: nuggetInclude,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const nugget = await prisma.nugget.findUnique({ where: { id, deletedAt: null } });
  if (!nugget) return NextResponse.json({ error: "Nugget não encontrado." }, { status: 404 });

  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  if (nugget.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas o criador ou admins podem excluir este nugget." }, { status: 403 });
  }

  await prisma.nugget.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ message: "Nugget excluído." });
}
