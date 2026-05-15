import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const unreadOnly = sp.get("unread") === "true";
  const skip = parseInt(sp.get("skip") ?? "0");
  const limit = parseInt(sp.get("limit") ?? "20");

  const where = {
    userId: session!.user.id,
    ...(unreadOnly && { isRead: false }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, total, unreadCount });
}
