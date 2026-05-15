import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser hex válido (#RRGGBB)"),
  icon: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const types = await prisma.nuggetType.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const exists = await prisma.nuggetType.findUnique({ where: { name: parsed.data.name } });
  if (exists) {
    return NextResponse.json({ error: "Já existe um tipo com esse nome." }, { status: 409 });
  }

  const maxOrder = await prisma.nuggetType.aggregate({ _max: { order: true } });
  const type = await prisma.nuggetType.create({
    data: { ...parsed.data, order: (maxOrder._max.order ?? -1) + 1, createdById: session!.user.id },
  });

  return NextResponse.json(type, { status: 201 });
}
