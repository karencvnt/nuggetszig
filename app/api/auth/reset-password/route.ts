import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string().uuid(),
  password: z
    .string()
    .min(10)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    }),
    // Invalidate all active sessions
    prisma.session.deleteMany({ where: { userId: record.userId } }),
    // Mark token as used
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Senha redefinida com sucesso." });
}
