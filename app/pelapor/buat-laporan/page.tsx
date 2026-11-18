import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import ReportForm from "./report-form";
import SidebarPelapor from "../components/SidebarPelapor";

export default async function BuatLaporanPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PELAPOR") {
    redirect("/login?callbackUrl=/pelapor/buat-laporan");
  }

  const [kategori, lokasi] = await Promise.all([
    prisma.kategoriKasus.findMany({
      where: {
        idKategori: {
          in: ["kat-01", "kat-02", "kat-03", "kat-04", "kat-05"],
        },
      },
      select: {
        idKategori: true,
        nama: true,
      },
      orderBy: {
        idKategori: "asc",
      },
    }),
    prisma.lokasi.findMany({
      select: {
        idLokasi: true,
        namaGedung: true,
        area: true,
      },
      orderBy: [
        { namaGedung: "asc" },
        { area: "asc" },
      ],
    }),
  ]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#f3f6fa] text-[#193652]">
      <SidebarPelapor
        emergencyReport={{ path: "/emergency-report" }}
      />

      <main className="min-w-0 flex-1">
        <ReportForm
          categories={kategori}
          locations={lokasi}
          reporterName={session.user.name ?? "Pelapor"}
          reporterType={session.user.jenisPengguna ?? "Pelapor"}
        />
      </main>
    </div>
  );
}