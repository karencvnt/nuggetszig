import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(2),
  squad: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "profile") {
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        squad: parsed.data.squad ?? null,
        avatarUrl: parsed.data.avatarUrl || null,
      },
      select: { id: true, name: true, squad: true, avatarUrl: true },
    });

    return NextResponse.json(user);
  }

  if (action === "password") {
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.password) {
      return NextResponse.json({ error: "Conta sem senha definida." }, { status: 400 });
    }

    const match = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!match) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: newHash },
    });

    return NextResponse.json({ message: "Senha alterada com sucesso." });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
