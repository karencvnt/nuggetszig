import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import SourceForm from "../../source-form";

export default async function EditSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const [source, methods] = await Promise.all([
    prisma.source.findUnique({ where: { id } }),
    prisma.researchMethod.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  if (!source) notFound();
  if (session.user.role === "VIEWER") redirect(`/app/sources/${id}`);
  if (source.createdById !== session.user.id && session.user.role !== "ADMIN") {
    redirect(`/app/sources/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-neutral-900 mb-6">Editar fonte</h1>
      <SourceForm methods={methods} initial={source} />
    </div>
  );
}
