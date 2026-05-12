import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const schema = z.object({
  title: z.string().min(1).optional(),
  methodId: z.string().uuid().optional(),
  squad: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  participantCount: z.number().int().min(0).optional().nullable(),
  artifactUrl: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      method: true,
      createdBy: { select: { id: true, name: true } },
      participants: {
        include: {
          participant: {
            include: { segment: { select: { name: true } } },
          },
        },
      },
      _count: { select: { nuggets: true } },
    },
  });

  if (!source) return NextResponse.json({ error: "Fonte não encontrada." }, { status: 404 });
  return NextResponse.json(source);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Fonte não encontrada." }, { status: 404 });

  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  if (source.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas o criador ou admins podem editar esta fonte." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { artifactUrl, ...rest } = parsed.data;
  const updated = await prisma.source.update({
    where: { id },
    data: { ...rest, ...(artifactUrl !== undefined && { artifactUrl: artifactUrl || null }) },
    include: { method: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Fonte não encontrada." }, { status: 404 });

  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  if (source.createdById !== session!.user.id && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas o criador ou admins podem excluir esta fonte." }, { status: 403 });
  }

  const nuggetCount = await prisma.nugget.count({ where: { sourceId: id } });
  if (nuggetCount > 0) {
    return NextResponse.json(
      { error: `Esta fonte possui ${nuggetCount} nugget(s). Archive-a em vez de excluir.` },
      { status: 409 }
    );
  }

  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ message: "Fonte excluída." });
}
