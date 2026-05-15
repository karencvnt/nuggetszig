import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({ ids: z.array(z.string()) });

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.nuggetType.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ message: "Ordem atualizada." });
}
