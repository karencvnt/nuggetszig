import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import ParticipantsClient from "./participants-client";

export default async function ParticipantsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [participants, segments] = await Promise.all([
    prisma.participant.findMany({
      include: {
        segment: { select: { name: true } },
        _count: { select: { sources: true, nuggets: true } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.segment.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const canCreate = session.user.role !== "VIEWER";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Participantes</h1>
          <p className="text-sm text-neutral-500 mt-1">{participants.length} participante{participants.length !== 1 ? "s" : ""} cadastrado{participants.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <ParticipantsClient
        initialParticipants={participants.map((p) => ({ ...p, _count: { sources: p._count.sources, nuggets: p._count.nuggets } }))}
        segments={segments}
        canCreate={canCreate}
      />
    </div>
  );
}
