import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportClient from "./import-client";

export default async function ImportPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "VIEWER") redirect("/app");

  return <ImportClient />;
}
