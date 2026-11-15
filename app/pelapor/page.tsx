import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import DashboardPengguna from "./components/DashboardPengguna";

export default async function DashboardPenggunaPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PELAPOR") {
    redirect("/login?callbackUrl=/pelapor");
  }

  return <DashboardPengguna />;
}