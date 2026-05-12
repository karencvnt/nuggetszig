import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountClient from "./account-client";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 mb-8">Minha conta</h1>
      <AccountClient user={session.user} />
    </div>
  );
}
