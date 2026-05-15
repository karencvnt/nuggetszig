import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { calculateCompletenessScore } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

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

export const NUGGET_INCLUDE = {
  type: { select: { id: true, name: true, color: true, icon: true } },
  source: { select: { id: true, title: true } },
  participant: { select: { id: true, code: true } },
  createdBy: { select: { id: true, name: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  _count: { select: { relationsFrom: true, relationsTo: true } },
} as const;

export function buildNuggetWhere(sp: URLSearchParams): Prisma.NuggetWhereInput {
  const q = sp.get("q") ?? "";
  const types = sp.get("type")?.split(",").filter(Boolean) ?? [];
  const statuses = sp.get("status")?.split(",").filter(Boolean) ?? [];
  const sentiments = sp.get("sentiment")?.split(",").filter(Boolean) ?? [];
  const journeyId = sp.get("journey") ?? "";
  const stage = sp.get("stage") ?? "";
  const segments = sp.get("segment")?.split(",").filter(Boolean) ?? [];
  const tagIds = sp.get("tags")?.split(",").filter(Boolean) ?? [];
  const from = sp.get("from");
  const to = sp.get("to");
  const squad = sp.get("squad") ?? "";
  const createdBy = sp.get("createdBy") ?? "";

  return {
    deletedAt: null,
    ...(q && { content: { contains: q, mode: "insensitive" } }),
    ...(types.length && { typeId: { in: types } }),
    ...(statuses.length && { status: { in: statuses as ("NEW" | "VALIDATED" | "INVESTIGATING" | "DISCARDED" | "ADDRESSED")[] } }),
    ...(sentiments.length && { sentiment: { in: sentiments as ("POSITIVE" | "NEUTRAL" | "NEGATIVE")[] } }),
    ...(journeyId && { journeyId }),
    ...(stage && { journeyStage: stage }),
    ...(segments.length && { participant: { segmentId: { in: segments } } }),
    ...(tagIds.length && { tags: { some: { tagId: { in: tagIds } } } }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
      },
    }),
    ...(squad && { source: { squad: { contains: squad, mode: "insensitive" } } }),
    ...(createdBy && { createdById: createdBy }),
  };
}

export function buildNuggetOrderBy(sp: URLSearchParams): Prisma.NuggetOrderByWithRelationInput {
  const sortBy = sp.get("sortBy") ?? "createdAt_desc";
  if (sortBy === "createdAt_asc") return { createdAt: "asc" };
  if (sortBy === "completenessScore_desc") return { completenessScore: "desc" };
  return { createdAt: "desc" };
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const sp = new URL(req.url).searchParams;
  const skip = Math.max(0, parseInt(sp.get("skip") ?? "0"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50")));

  const where = buildNuggetWhere(sp);
  const orderBy = buildNuggetOrderBy(sp);

  const [total, items] = await Promise.all([
    prisma.nugget.count({ where }),
    prisma.nugget.findMany({ where, include: NUGGET_INCLUDE, orderBy, skip, take: limit }),
  ]);

  return NextResponse.json({ items, total, hasMore: skip + limit < total });
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
