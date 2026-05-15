import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { calculateCompletenessScore } from "@/lib/utils";

const createSchema = z.object({
  content: z.string().min(1, "Conteúdo obrigatório").max(500),
  typeId: z.string().uuid(),
  sourceId: z.string().uuid(),
  participantId: z.string().uuid().optional().nullable(),
  journeyId: z.string().uuid().optional().nullable(),
  journeyStage: z.string().optional().nullable(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional().nullable(),
  impact: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().nullable(),
  evidenceUrl: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const typeId = searchParams.get("typeId");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const nuggets = await prisma.nugget.findMany({
    where: {
      deletedAt: null,
      ...(typeId && { typeId }),
      ...(status && { status: status as "NEW" | "VALIDATED" | "INVESTIGATING" | "DISCARDED" | "ADDRESSED" }),
      ...(q && { content: { contains: q, mode: "insensitive" } }),
    },
    include: {
      type: { select: { id: true, name: true, color: true, icon: true } },
      source: { select: { id: true, title: true } },
      participant: { select: { id: true, code: true } },
      createdBy: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      _count: { select: { relationsFrom: true, relationsTo: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(nuggets);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { tagIds, evidenceUrl, ...data } = parsed.data;

  const completenessScore = calculateCompletenessScore({
    typeId: data.typeId,
    sourceId: data.sourceId,
    journeyId: data.journeyId,
    tags: tagIds ?? [],
    sentiment: data.sentiment,
    impact: data.impact,
    evidenceUrl: evidenceUrl || null,
  });

  const nugget = await prisma.nugget.create({
    data: {
      ...data,
      evidenceUrl: evidenceUrl || null,
      completenessScore,
      createdById: session!.user.id,
      ...(tagIds && tagIds.length > 0 && {
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      }),
    },
    include: {
      type: { select: { id: true, name: true, color: true } },
      source: { select: { id: true, title: true } },
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json(nugget, { status: 201 });
}
