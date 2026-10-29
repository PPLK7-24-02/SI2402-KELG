import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import DaftarLaporanShell from "./components/DaftarLaporanShell";
import { DUMMY_LAPORAN } from "./dummy-data";
import type { LaporanRow } from "./components/types";

export const metadata = {
  title: "Daftar Laporan | SAFE SPACE Satgas PPKS",
  description:
    "Halaman daftar seluruh laporan kasus yang diterima oleh Satgas PPKS Telkom University.",
};

async function getLaporan(): Promise<LaporanRow[]> {
  try {
    const laporan = await prisma.laporan.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        idLaporan: true,
        nomorKasus: true,
        jenis: true,
        waktuKejadian: true,
        tingkatUrgensi: true,
        status: true,
        isAnonim: true,
        createdAt: true,
        kategori: {
          select: { nama: true },
        },
        lokasi: {
          select: { namaGedung: true, area: true },
        },
        pelapor: {
          select: { nama: true, jenisPengguna: true },
        },
      },
    });

    if (!laporan || laporan.length === 0) {
      return DUMMY_LAPORAN;
    }

    return laporan as unknown as LaporanRow[];
  } catch (error) {
    console.warn(
      "[DAFTAR_LAPORAN] Database belum memiliki data atau belum terhubung, menampilkan data dummy:",
      error
    );
    return DUMMY_LAPORAN;
  }
}

export default async function DaftarLaporanPage() {
  const session = await getServerSession(authOptions);

  // Jika di mode production dan belum login sebagai satgas, redirect ke login
  if (
    process.env.NODE_ENV === "production" &&
    (!session?.user?.id || session.user.role !== "SATGAS")
  ) {
    redirect("/login");
  }

  const laporan = await getLaporan();

  const satgas = {
    name: session?.user?.name ?? "Satgas PPKS Tel-U",
    email: session?.user?.email ?? "satgas@telkomuniversity.ac.id",
    initials: (session?.user?.name ?? "SP")
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
  };

  return <DaftarLaporanShell laporan={laporan} satgas={satgas} />;
}

