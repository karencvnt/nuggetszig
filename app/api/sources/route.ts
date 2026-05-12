import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const schema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  methodId: z.string().uuid("Método inválido"),
  squad: z.string().optional(),
  description: z.string().optional(),
  objective: z.string().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  participantCount: z.number().int().min(0).optional().nullable(),
  artifactUrl: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const methodId = searchParams.get("methodId");
  const squad = searchParams.get("squad");
  const status = searchParams.get("status");

  const sources = await prisma.source.findMany({
    where: {
      ...(methodId && { methodId }),
      ...(squad && { squad: { contains: squad, mode: "insensitive" } }),
      ...(status && { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" }),
    },
    include: {
      method: { select: { id: true, name: true, category: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { nuggets: true, participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado. Apenas Contributors e Admins podem criar fontes." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { artifactUrl, ...rest } = parsed.data;
  const source = await prisma.source.create({
    data: {
      ...rest,
      artifactUrl: artifactUrl || null,
      createdById: session!.user.id,
    },
    include: { method: { select: { name: true } } },
  });

  return NextResponse.json(source, { status: 201 });
}
