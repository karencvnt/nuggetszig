import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { expires: "desc" },
    select: { id: true, expires: true },
  });

  return NextResponse.json(sessions);
}
