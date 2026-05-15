import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }), session: null };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }), session: null };
  }
  return { error: null, session };
}
