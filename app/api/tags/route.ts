import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(50),
  category: z.string().default("Geral"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#94a3b8"),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const tags = await prisma.tag.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, color: true, category: true },
  });

  return NextResponse.json(tags);
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
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const existing = await prisma.tag.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json(existing);

  const tag = await prisma.tag.create({
    data: { ...parsed.data, createdById: session!.user.id },
    select: { id: true, name: true, color: true, category: true },
  });
  return NextResponse.json(tag, { status: 201 });
}
