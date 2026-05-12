import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const schema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  segmentId: z.string().uuid().optional().nullable(),
  persona: z.string().optional().nullable(),
  usageProfile: z.string().optional().nullable(),
  timeAsClient: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const participants = await prisma.participant.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { persona: { contains: q, mode: "insensitive" } },
            { region: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      segment: { select: { id: true, name: true } },
      _count: { select: { sources: true, nuggets: true } },
    },
    orderBy: { code: "asc" },
    take: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
  });

  return NextResponse.json(participants);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.participant.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return NextResponse.json({ error: `Já existe um participante com o código "${parsed.data.code}".` }, { status: 409 });
  }

  const participant = await prisma.participant.create({
    data: { ...parsed.data, createdById: session!.user.id },
    include: { segment: { select: { name: true } } },
  });

  return NextResponse.json(participant, { status: 201 });
}
