import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  stages: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const journey = await prisma.journey.update({ where: { id }, data: parsed.data });
  return NextResponse.json(journey);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const count = await prisma.nugget.count({ where: { journeyId: id } });
  if (count > 0) {
    return NextResponse.json({ error: `Esta jornada possui ${count} nugget(s) vinculado(s). Desative-a em vez de excluir.` }, { status: 409 });
  }

  await prisma.journey.delete({ where: { id } });
  return NextResponse.json({ message: "Jornada excluída." });
}
