import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  role: z.enum(["VIEWER", "CONTRIBUTOR", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (id === session!.user.id && req.headers.get("content-type")) {
    const body = await req.json();
    if (body.isActive === false) {
      return NextResponse.json({ error: "Você não pode desativar sua própria conta." }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    return NextResponse.json(user);
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const user = await prisma.user.update({ where: { id }, data: parsed.data });

  // If deactivating, end all sessions immediately
  if (parsed.data.isActive === false) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json(user);
}
