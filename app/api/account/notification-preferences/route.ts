import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { NotificationType } from "@prisma/client";

const ALL_TYPES: NotificationType[] = [
  "NEW_NUGGET_TAG",
  "NEW_NUGGET_JOURNEY",
  "COMMENT_ON_MY_NUGGET",
  "MENTION",
  "WEEKLY_DIGEST",
];

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const prefs = await prisma.userNotificationPreference.findMany({
    where: { userId: session!.user.id },
  });

  const map = Object.fromEntries(prefs.map((p) => [p.eventType, p.isEnabled]));
  const result = ALL_TYPES.map((t) => ({ eventType: t, isEnabled: map[t] ?? true }));

  const interestTags = await prisma.userInterestTag.findMany({
    where: { userId: session!.user.id },
    include: { tag: { select: { id: true, name: true, color: true } } },
  });

  const interestJourneys = await prisma.userInterestJourney.findMany({
    where: { userId: session!.user.id },
    include: { journey: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json({ preferences: result, interestTags, interestJourneys });
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { preferences, tagIds, journeyIds } = body as {
    preferences?: { eventType: string; isEnabled: boolean }[];
    tagIds?: string[];
    journeyIds?: string[];
  };

  if (preferences) {
    await prisma.$transaction(
      preferences
        .filter((p) => ALL_TYPES.includes(p.eventType as NotificationType))
        .map((p) =>
          prisma.userNotificationPreference.upsert({
            where: { userId_eventType: { userId: session!.user.id, eventType: p.eventType as NotificationType } },
            create: { userId: session!.user.id, eventType: p.eventType as NotificationType, isEnabled: p.isEnabled },
            update: { isEnabled: p.isEnabled },
          })
        )
    );
  }

  if (Array.isArray(tagIds)) {
    await prisma.userInterestTag.deleteMany({ where: { userId: session!.user.id } });
    if (tagIds.length > 0) {
      await prisma.userInterestTag.createMany({
        data: tagIds.map((tagId) => ({ userId: session!.user.id, tagId })),
        skipDuplicates: true,
      });
    }
  }

  if (Array.isArray(journeyIds)) {
    await prisma.userInterestJourney.deleteMany({ where: { userId: session!.user.id } });
    if (journeyIds.length > 0) {
      await prisma.userInterestJourney.createMany({
        data: journeyIds.map((journeyId) => ({ userId: session!.user.id, journeyId })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
