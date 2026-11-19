import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    // Nama pelapor anonim disembunyikan sebelum dikirim.
    const hasil = laporan.map((l) =>
      l.isAnonim ? { ...l, pelapor: { nama: "Anonim", jenisPengguna: null } } : l
    );

    return NextResponse.json({ laporan: hasil }, { status: 200 });
  } catch (error) {
    console.error("[DAFTAR_LAPORAN] Error fetching laporan:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

