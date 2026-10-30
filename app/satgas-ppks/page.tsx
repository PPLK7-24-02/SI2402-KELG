import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import DashboardMonitoring from "./components/DashboardMonitoring";

export const metadata = {
  title: "Dashboard Monitoring | SAFE SPACE Satgas PPKS",
  description:
    "Ringkasan status dan distribusi kasus berdasarkan kategori, lokasi, dan periode waktu.",
};

export default async function SatgasDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "SATGAS") {
    redirect("/login?callbackUrl=/satgas-ppks");
  }

  const name = session.user.name ?? "Satgas PPKS";

  return (
    <DashboardMonitoring
      satgas={{
        name,
        email: session.user.email ?? "",
        initials: name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase(),
      }}
    />
  );
}
