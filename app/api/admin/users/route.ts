import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { generateToken, hashToken, tokenExpiresAt } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEWER", "CONTRIBUTOR", "ADMIN"]),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, squad: true },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });

  // Create inactive user with invite token
  const token = generateToken();
  const tokenHash = hashToken(token);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.email.split("@")[0],
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: true,
      emailVerificationTokens: {
        create: {
          tokenHash,
          expiresAt: tokenExpiresAt(7 * 24), // 7 days
        },
      },
    },
  });

  try {
    await sendInviteEmail(parsed.data.email, token, session!.user.name ?? "Equipe Nuggets");
  } catch {
    // Don't block invite if email fails
  }

  return NextResponse.json(user, { status: 201 });
}
