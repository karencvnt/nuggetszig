import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  });

  await prisma.emailVerificationToken.delete({ where: { tokenHash } });

  return NextResponse.json({ message: "E-mail verificado com sucesso." });
}
