// ============================================================
// US-10: Tracking Status & Perkembangan Laporan oleh Pelapor
// File: app/api/pelapor/laporan/[idLaporan]/tracking/route.ts
// GET — Ambil detail laporan milik pelapor yang sedang login
// AC-03: ownership enforced — pelaporId harus cocok dengan session
// AC-04: catatan internal PPKS tidak dikembalikan
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idLaporan: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // ── Auth: hanya PELAPOR yang boleh akses ─────────────────
    if (!session?.user?.id || session.user.role !== "PELAPOR") {
      return NextResponse.json(
        {
          message:
            "Akses tidak diizinkan. Silakan login sebagai pelapor terlebih dahulu.",
          callbackUrl: "/login",
        },
        { status: 401 }
      );
    }

    const { idLaporan } = await params;
    const pelaporId = session.user.id;

    // ── Fetch dengan ownership check (AC-03) ─────────────────
    const laporan = await prisma.laporan.findFirst({
      where: {
        idLaporan,
        pelaporId, // ← hanya milik pelapor ini
      },
      select: {
        idLaporan: true,
        nomorKasus: true,
        jenis: true,
        kronologi: true,
        waktuKejadian: true,
        detailLokasi: true,
        isAnonim: true,
        tingkatUrgensi: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        kategori: { select: { nama: true, deskripsi: true } },
        lokasi: { select: { namaGedung: true, area: true } },
        // AC-04: catatan internal tidak dikembalikan
        riwayatPenanganan: {
          orderBy: { createdAt: "desc" },
          select: {
            idRiwayat: true,
            jenisAktivitas: true,
            statusBaru: true,
            createdAt: true,
            // catatan: TIDAK diselect
          },
        },
        _count: {
          select: { buktiLaporan: true },
        },
      },
    });

    // Jika tidak ditemukan atau bukan milik pelapor → 404
    if (!laporan) {
      return NextResponse.json(
        { message: "Laporan tidak ditemukan atau Anda tidak memiliki akses." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...laporan,
          jumlahBukti: laporan._count.buktiLaporan,
          _count: undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[TRACKING_DETAIL] Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
