import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import ReportForm from "./report-form";

export default async function BuatLaporanPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PELAPOR") {
    redirect("/login?callbackUrl=/laporan/buat");
  }

  const [kategori, lokasi] = await Promise.all([
    prisma.kategoriKasus.findMany({
      select: { idKategori: true, nama: true },
      orderBy: { nama: "asc" },
    }),
    prisma.lokasi.findMany({
      select: { idLokasi: true, namaGedung: true, area: true },
      orderBy: [{ namaGedung: "asc" }, { area: "asc" }],
    }),
  ]);

  return (
    <ReportForm
      categories={kategori}
      locations={lokasi}
      reporterName={session.user.name ?? "Pelapor"}
      reporterType={session.user.jenisPengguna ?? "Pelapor"}
    />
  );
}