import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DUMMY_LAPORAN } from "@/app/satgas-ppks/daftar-laporan/dummy-data";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      process.env.NODE_ENV === "production" &&
      (!session?.user?.id || session.user.role !== "SATGAS")
    ) {
      return NextResponse.json(
        { message: "Akses tidak diizinkan. Hanya Satgas PPKS yang dapat mengakses daftar laporan." },
        { status: 403 }
      );
    }

    let laporan: unknown[] = [];
    try {
      laporan = await prisma.laporan.findMany({
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
    } catch {
      laporan = [];
    }

    if (!laporan || laporan.length === 0) {
      return NextResponse.json({ laporan: DUMMY_LAPORAN }, { status: 200 });
    }

    return NextResponse.json({ laporan }, { status: 200 });
  } catch (error) {
    console.error("[DAFTAR_LAPORAN] Error fetching laporan:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

