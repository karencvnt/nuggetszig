import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken, tokenExpiresAt } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

const MAX_RESENDS = 3;
const COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "E-mail obrigatório." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) {
    // Respond generically to prevent enumeration
    return NextResponse.json({ message: "Se o e-mail estiver pendente, enviaremos um novo link." });
  }

  const record = await prisma.emailVerificationToken.findFirst({ where: { userId: user.id } });
  const now = new Date();

  if (record) {
    // Cooldown check
    const sinceLastSent = now.getTime() - record.lastSentAt.getTime();
    if (sinceLastSent < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - sinceLastSent) / 1000);
      return NextResponse.json({ error: `Aguarde ${wait}s antes de reenviar.` }, { status: 429 });
    }

    // Max resend check within window
    const sinceCreated = now.getTime() - record.createdAt.getTime();
    if (sinceCreated < WINDOW_MS && record.resendCount >= MAX_RESENDS) {
      return NextResponse.json({ error: "Limite de reenvios atingido. Tente novamente amanhã." }, { status: 429 });
    }

    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: tokenExpiresAt(24),
      resendCount: record ? record.resendCount + 1 : 0,
      lastSentAt: now,
    },
  });

  await sendVerificationEmail(email, token);

  return NextResponse.json({ message: "E-mail de verificação reenviado." });
}
