import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const mine = sp.get("mine") === "true";

  const where = mine
    ? { createdById: session!.user.id }
    : {
        OR: [
          { createdById: session!.user.id },
          { visibility: "TEAM" as const },
          { visibility: "COMPANY" as const },
        ],
      };

  const collections = await prisma.collection.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { nuggets: true } },
    },
  });

  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Sem permissão para criar coleções." }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, context, visibility } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }

  const validVisibility = ["PRIVATE", "TEAM", "COMPANY"];
  if (visibility && !validVisibility.includes(visibility)) {
    return NextResponse.json({ error: "Visibilidade inválida." }, { status: 400 });
  }

  const collection = await prisma.collection.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      context: context?.trim() || null,
      visibility: visibility ?? "TEAM",
      createdById: session!.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { nuggets: true } },
    },
  });

  return NextResponse.json(collection, { status: 201 });
}
