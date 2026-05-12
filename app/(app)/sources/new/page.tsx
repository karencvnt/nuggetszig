import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SourceForm from "../source-form";

export default async function NewSourcePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "VIEWER") redirect("/app/sources");

  const methods = await prisma.researchMethod.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-neutral-900 mb-6">Nova fonte de pesquisa</h1>
      <SourceForm methods={methods} />
    </div>
  );
}
