import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  stages: z.array(z.string().min(1)).min(1, "Pelo menos uma etapa é obrigatória"),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const journeys = await prisma.journey.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(journeys);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });

  const maxOrder = await prisma.journey.aggregate({ _max: { order: true } });
  const journey = await prisma.journey.create({
    data: { ...parsed.data, order: (maxOrder._max.order ?? -1) + 1, createdById: session!.user.id },
  });
  return NextResponse.json(journey, { status: 201 });
}
