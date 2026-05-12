import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const segments = await prisma.segment.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(segments);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const exists = await prisma.segment.findUnique({ where: { name: parsed.data.name } });
  if (exists) return NextResponse.json({ error: "Já existe um segmento com esse nome." }, { status: 409 });

  const segment = await prisma.segment.create({ data: { ...parsed.data, createdById: session!.user.id } });
  return NextResponse.json(segment, { status: 201 });
}
