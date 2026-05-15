import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken, tokenExpiresAt } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const GENERIC_RESPONSE = { message: "Se o e-mail estiver cadastrado, enviaremos um link em breve." };

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(GENERIC_RESPONSE); // Still return generic to prevent timing attacks
  }

  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const user = await prisma.user.findUnique({ where: { email, isActive: true } });

  if (user) {
    // Invalidate any existing reset tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = generateToken();
    const tokenHash = hashToken(token);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: tokenExpiresAt(1),
      },
    });

    try {
      await sendPasswordResetEmail(email, token);
    } catch {
      // Fail silently — don't reveal if email was sent
    }
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
