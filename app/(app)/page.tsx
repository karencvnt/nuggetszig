import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppHomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Repositório</h1>
      <p className="text-neutral-500">Olá, {session.user.name}. O repositório de nuggets será construído aqui.</p>
    </div>
  );
}
