import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const jumlahPelapor = await prisma.pelapor.count();
    const jumlahLaporan = await prisma.laporan.count();

    return NextResponse.json({
      success: true,
      message: "Database berhasil terhubung",
      data: {
        jumlahPelapor,
        jumlahLaporan,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Database gagal terhubung",
      },
      { status: 500 }
    );
  }
}
