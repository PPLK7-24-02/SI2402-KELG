import { createHash, randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const CATEGORY_ID = "kat-emergency-sos";
const LOCATION_ID = "lok-emergency-unknown";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reportSelect = {
  idLaporan: true,
  nomorKasus: true,
  createdAt: true,
  waktuKejadian: true,
  pelaporId: true,
  jenis: true,
} as const;

function failure(status: number, message: string) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

type CreatedReport = {
  idLaporan: string;
  nomorKasus: string;
  createdAt: Date;
  waktuKejadian: Date;
  pelaporId: string;
  jenis: string;
};

function success(report: CreatedReport, pelaporId: string, replayed: boolean) {
  // A primary-key collision must never expose another report.
  if (report.pelaporId !== pelaporId || report.jenis !== "EMERGENCY") {
    return failure(409, "Identitas permintaan berbenturan. Gunakan key baru untuk laporan baru.");
  }
  return NextResponse.json(
    {
      success: true,
      message: "Laporan darurat tersimpan.",
      data: {
        idLaporan: report.idLaporan,
        nomorKasus: report.nomorKasus,
        createdAt: report.createdAt,
        waktuKejadian: report.waktuKejadian,
        replayed,
      },
    },
    { status: replayed ? 200 : 201, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const user = (await getServerSession(authOptions))?.user;
    if (!user?.id) return failure(401, "Silakan masuk untuk membuat laporan darurat.");
    if (user.role !== "PELAPOR") {
      return failure(403, "Hanya akun pelapor yang dapat membuat laporan darurat.");
    }

    // Browser cross-origin submissions are rejected. Non-browser callers may
    // omit Origin, but still need a valid session and the UUID request header.
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return failure(403, "Asal permintaan tidak diizinkan.");
    }
    const key = request.headers.get("idempotency-key")?.trim().toLowerCase();
    if (!key || !UUID_V4.test(key)) {
      return failure(400, "Header Idempotency-Key wajib berupa UUID v4; gunakan key yang sama saat retry.");
    }

    const pelapor = await prisma.pelapor.findUnique({
      where: { idPelapor: user.id },
      select: { idPelapor: true },
    });
    if (!pelapor) return failure(401, "Akun pelapor tidak lagi tersedia. Silakan masuk kembali.");

    // Existing varchar(30) primary key supplies database-enforced idempotency.
    // Stable across dates; scoped to the server session, never a browser ID.
    const idLaporan = `sos${createHash("sha256")
      .update(JSON.stringify(["emergency-create-v1", pelapor.idPelapor, key]))
      .digest("hex").slice(0, 27)}`;
    const existing = await prisma.laporan.findUnique({ where: { idLaporan }, select: reportSelect });
    if (existing) return success(existing, pelapor.idPelapor, true);

    const [kategori, lokasi] = await Promise.all([
      prisma.kategoriKasus.findUnique({ where: { idKategori: CATEGORY_ID }, select: { nama: true } }),
      prisma.lokasi.findUnique({ where: { idLokasi: LOCATION_ID }, select: { namaGedung: true, area: true } }),
    ]);
    if (
      kategori?.nama !== "Emergency SOS - Belum Diklasifikasikan" ||
      lokasi?.namaGedung !== "Lokasi Belum Diketahui" ||
      lokasi.area !== "Belum tersedia saat SOS dibuat."
    ) {
      return failure(503, "Referensi SOS belum tersedia atau tidak sesuai. Hubungi pengelola.");
    }

    const now = new Date();
    for (let attempt = 0; attempt < 3; attempt++) {
      const nomorKasus = `SS-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      try {
        // One atomic insert. No GPS, filesystem, media, or evidence dependency.
        const laporan = await prisma.laporan.create({
          data: {
            idLaporan,
            nomorKasus,
            jenis: "EMERGENCY",
            tingkatUrgensi: "DARURAT",
            status: "DITERIMA",
            kronologi: "SOS diaktifkan oleh pelapor. Rincian kejadian belum diberikan.",
            detailLokasi: "Lokasi belum tersedia saat SOS dibuat.",
            waktuKejadian: now,
            createdAt: now,
            isAnonim: false,
            pelapor: { connect: { idPelapor: pelapor.idPelapor } },
            kategori: { connect: { idKategori: CATEGORY_ID } },
            lokasi: { connect: { idLokasi: LOCATION_ID } },
          },
          select: reportSelect,
        });
        return success(laporan, pelapor.idPelapor, false);
      } catch (error) {
        if (errorCode(error) !== "P2002") throw error;
        // Concurrent request with the same key may already have committed.
        const committed = await prisma.laporan.findUnique({ where: { idLaporan }, select: reportSelect });
        if (committed) return success(committed, pelapor.idPelapor, true);
        // Otherwise retry a random case-number collision without changing ID.
      }
    }
    return failure(503, "Nomor kasus belum dapat dialokasikan. Ulangi dengan Idempotency-Key yang sama.");
  } catch {
    return failure(500, "Laporan belum dapat dikonfirmasi. Ulangi dengan Idempotency-Key yang sama.");
  }
}
