import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  // Prevent deactivating the last active type
  if (parsed.data.isActive === false) {
    const activeCount = await prisma.nuggetType.count({ where: { isActive: true } });
    if (activeCount <= 1) {
      return NextResponse.json({ error: "Não é possível desativar o único tipo ativo." }, { status: 409 });
    }
  }

  if (parsed.data.name) {
    const exists = await prisma.nuggetType.findFirst({ where: { name: parsed.data.name, NOT: { id } } });
    if (exists) return NextResponse.json({ error: "Já existe um tipo com esse nome." }, { status: 409 });
  }

  const type = await prisma.nuggetType.update({ where: { id }, data: parsed.data });
  return NextResponse.json(type);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const nuggetCount = await prisma.nugget.count({ where: { typeId: id } });
  if (nuggetCount > 0) {
    return NextResponse.json(
      { error: `Este tipo possui ${nuggetCount} nugget(s) vinculado(s). Desative-o em vez de excluir.` },
      { status: 409 }
    );
  }

  await prisma.nuggetType.delete({ where: { id } });
  return NextResponse.json({ message: "Tipo excluído." });
}
