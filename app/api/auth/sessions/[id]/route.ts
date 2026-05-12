import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const target = await prisma.session.findUnique({ where: { id } });
  if (!target || target.userId !== session.user.id) {
    return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
  }

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ message: "Sessão encerrada." });
}
