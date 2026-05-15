import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  if (parsed.data.name) {
    const exists = await prisma.segment.findFirst({ where: { name: parsed.data.name, NOT: { id } } });
    if (exists) return NextResponse.json({ error: "Já existe um segmento com esse nome." }, { status: 409 });
  }

  const segment = await prisma.segment.update({ where: { id }, data: parsed.data });
  return NextResponse.json(segment);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const count = await prisma.participant.count({ where: { segmentId: id } });
  if (count > 0) {
    return NextResponse.json({ error: `Este segmento possui ${count} participante(s) vinculado(s). Desative-o em vez de excluir.` }, { status: 409 });
  }

  await prisma.segment.delete({ where: { id } });
  return NextResponse.json({ message: "Segmento excluído." });
}
