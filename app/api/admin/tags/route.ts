import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser hex válido"),
  description: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const tags = await prisma.tag.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const exists = await prisma.tag.findUnique({ where: { name: parsed.data.name } });
  if (exists) return NextResponse.json({ error: "Já existe uma tag com esse nome." }, { status: 409 });

  const tag = await prisma.tag.create({ data: { ...parsed.data, createdById: session!.user.id } });
  return NextResponse.json(tag, { status: 201 });
}
