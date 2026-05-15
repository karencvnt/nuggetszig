import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotificationPreferencesClient from "./notification-preferences-client";
import { NotificationType } from "@prisma/client";

const ALL_TYPES: NotificationType[] = [
  "NEW_NUGGET_TAG",
  "NEW_NUGGET_JOURNEY",
  "COMMENT_ON_MY_NUGGET",
  "MENTION",
  "WEEKLY_DIGEST",
];

export default async function NotificationPreferencesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [prefs, interestTags, interestJourneys, allTags, allJourneys] = await Promise.all([
    prisma.userNotificationPreference.findMany({ where: { userId: session.user.id } }),
    prisma.userInterestTag.findMany({
      where: { userId: session.user.id },
      select: { tagId: true },
    }),
    prisma.userInterestJourney.findMany({
      where: { userId: session.user.id },
      select: { journeyId: true },
    }),
    prisma.tag.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.journey.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ]);

  const prefMap = Object.fromEntries(prefs.map((p) => [p.eventType, p.isEnabled]));
  const initialPrefs = ALL_TYPES.map((t) => ({ eventType: t, isEnabled: prefMap[t] ?? true }));

  return (
    <NotificationPreferencesClient
      initialPrefs={initialPrefs}
      initialTagIds={interestTags.map((t) => t.tagId)}
      initialJourneyIds={interestJourneys.map((j) => j.journeyId)}
      allTags={allTags}
      allJourneys={allJourneys}
    />
  );
}
