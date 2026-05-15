import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["qualitativo", "quantitativo", "desk research"]).optional(),
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

  if (parsed.data.isActive === false) {
    const activeCount = await prisma.researchMethod.count({ where: { isActive: true } });
    if (activeCount <= 1) {
      return NextResponse.json({ error: "Não é possível desativar o único método ativo." }, { status: 409 });
    }
  }

  if (parsed.data.name) {
    const exists = await prisma.researchMethod.findFirst({ where: { name: parsed.data.name, NOT: { id } } });
    if (exists) return NextResponse.json({ error: "Já existe um método com esse nome." }, { status: 409 });
  }

  const method = await prisma.researchMethod.update({ where: { id }, data: parsed.data });
  return NextResponse.json(method);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const count = await prisma.source.count({ where: { methodId: id } });
  if (count > 0) {
    return NextResponse.json({ error: `Este método possui ${count} fonte(s) vinculada(s). Desative-o em vez de excluir.` }, { status: 409 });
  }

  await prisma.researchMethod.delete({ where: { id } });
  return NextResponse.json({ message: "Método excluído." });
}
