import { prisma } from "@/lib/prisma";
import UsersClient from "./users-client";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, squad: true, createdAt: true },
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900">Usuários</h1>
        <p className="text-sm text-neutral-500 mt-1">Gerencie os membros da plataforma e seus papéis.</p>
      </div>
      <UsersClient initialUsers={users} />
    </>
  );
}
