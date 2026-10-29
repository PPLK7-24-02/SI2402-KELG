import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = (await getServerSession(authOptions))?.user;

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengguna belum login atau tidak terautentikasi.",
          callbackUrl: "/pelapor",
        },
        { status: 401 }
      );
    }

    if (user.role !== "PELAPOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Pengguna tidak memiliki akses ke dashboard pelapor.",
        },
        { status: 403 }
      );
    }

    const pelapor = await prisma.pelapor.findUnique({
      where: { idPelapor: user.id },
      select: {
        idPelapor: true,
        nama: true,
      },
    });

    if (!pelapor) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pelapor tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const idPelapor = pelapor.idPelapor;
    const [
      totalLaporan,
      laporanDikirim,
      laporanDalamProses,
      laporanSelesai,
      laporanTerbaru,
      notifikasiTerbaru,
      totalNotifikasiBelumDibaca,
    ] = await Promise.all([
      prisma.laporan.count({
        where: { pelaporId: idPelapor },
      }),
      prisma.laporan.count({
        where: {
          pelaporId: idPelapor,
          status: "DITERIMA",
        },
      }),
      prisma.laporan.count({
        where: {
          pelaporId: idPelapor,
          status: {
            in: ["REVIEW", "DIVERIFIKASI", "DITANGANI"],
          },
        },
      }),
      prisma.laporan.count({
        where: {
          pelaporId: idPelapor,
          status: "SELESAI",
        },
      }),
      prisma.laporan.findMany({
        where: { pelaporId: idPelapor },
        select: {
          idLaporan: true,
          nomorKasus: true,
          status: true,
          createdAt: true,
          kategoriId: true,
          kategori: {
            select: {
              nama: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      prisma.notifikasi.findMany({
        where: {
          pelaporId: idPelapor,
        },
        select: {
          idNotif: true,
          judul: true,
          pesan: true,
          tipe: true,
          isRead: true,
          createdAt: true,
          laporanId: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      prisma.notifikasi.count({
        where: {
          pelaporId: idPelapor,
          isRead: false,
        },
      }),
    ]);

    const aksesCepat = [
      {
        label: "Buat Laporan",
        deskripsi: "Sampaikan kejadian secara aman.",
        path: "/buat-laporan",
      },
      {
        label: "Emergency Report",
        deskripsi: "Laporkan kondisi darurat.",
        path: "/emergency-report",
      },
      {
        label: "Lihat Status Laporan",
        deskripsi: "Pantau perkembangan laporan.",
        path: "/case-tracking",
      },
      {
        label: "Buka Halaman Edukasi",
        deskripsi: "Pelajari informasi dan edukasi PPKS.",
        path: "/edukasi",
      },
    ];

    return NextResponse.json({
      success: true,
      message: "Data dashboard berhasil diambil.",
      data: {
        pelapor: {
          idPelapor: pelapor.idPelapor,
          nama: pelapor.nama,
        },
        ringkasanLaporan: {
          totalLaporan,
          laporanDikirim,
          laporanDalamProses,
          laporanSelesai,
        },
        laporanTerbaru,
        notifikasi: {
          totalBelumDibaca: totalNotifikasiBelumDibaca,
          daftar: notifikasiTerbaru,
        },
        aksesCepat,
      },
    });
  } catch (error) {
    console.error("Error dashboard pengguna:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data dashboard.",
      },
      { status: 500 }
    );
  }
}
