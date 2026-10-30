import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buatDashboardDummy } from "./dummy";

export const runtime = "nodejs";

// Sementara: ubah ke false untuk kembali memakai data dari database.
const PAKAI_DATA_DUMMY = true;

const HARI_MS = 86_400_000;
const MAKS_HARI_PER_HARIAN = 62;
const MAKS_RENTANG_HARI = 366 * 5;
const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

type Distribusi = { nama: string; jumlah: number }[];

export type DashboardMonitoringData = {
  periode: { dari: string; sampai: string };
  ringkasan: {
    masuk: number;
    masukPeriodeSebelumnya: number;
    perluVerifikasi: number;
    perluVerifikasiUrgensiTinggi: number;
    sedangDitangani: number;
    diverifikasi: number;
    ditangani: number;
    selesai: number;
  };
  distribusi: {
    status: Distribusi;
    kategori: Distribusi;
    lokasi: Distribusi;
  };
  tren: {
    satuan: "hari" | "bulan";
    data: { label: string; jumlah: number }[];
  };
  laporanTerbaru: {
    idLaporan: string;
    nomorKasus: string;
    kategori: string;
    lokasi: string;
    tingkatUrgensi: string;
    status: string;
    createdAt: string;
  }[];
  incidentAlert: {
    idIncident: string;
    kodeKamera: string;
    lokasi: string;
    waktuDeteksi: string;
    confidence: number;
    statusVerifikasi: string;
  }[];
  aktivitasTerbaru: {
    idRiwayat: string;
    jenisAktivitas: string;
    nomorKasus: string;
    petugas: string;
    catatan: string | null;
    createdAt: string;
  }[];
  diperbaruiPada: string;
  dummy?: boolean;
};

const LABEL_STATUS: Record<string, string> = {
  DITERIMA: "Diterima",
  DIVERIFIKASI: "Diverifikasi",
  DITANGANI: "Ditangani",
  SELESAI: "Selesai",
  TIDAK_VALID: "Tidak Valid",
};

function parseTanggal(nilai: string | null) {
  if (!nilai || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return null;
  const [tahun, bulan, hari] = nilai.split("-").map(Number);
  const tanggal = new Date(tahun, bulan - 1, hari);
  return tanggal.getMonth() === bulan - 1 && tanggal.getDate() === hari
    ? tanggal
    : null;
}

function kunciHari(tanggal: Date) {
  return `${tanggal.getFullYear()}-${tanggal.getMonth() + 1}-${tanggal.getDate()}`;
}

function kunciBulan(tanggal: Date) {
  return `${tanggal.getFullYear()}-${tanggal.getMonth() + 1}`;
}

function buatTren(daftarTanggal: Date[], awal: Date, akhirEksklusif: Date) {
  const jumlahHari = Math.round(
    (akhirEksklusif.getTime() - awal.getTime()) / HARI_MS
  );
  const satuan: "hari" | "bulan" =
    jumlahHari <= MAKS_HARI_PER_HARIAN ? "hari" : "bulan";
  const kunci = satuan === "hari" ? kunciHari : kunciBulan;

  const hitungan = new Map<string, number>();
  for (const tanggal of daftarTanggal) {
    const k = kunci(tanggal);
    hitungan.set(k, (hitungan.get(k) ?? 0) + 1);
  }

  const data: { label: string; jumlah: number }[] = [];
  const kursor =
    satuan === "hari"
      ? new Date(awal)
      : new Date(awal.getFullYear(), awal.getMonth(), 1);

  while (kursor < akhirEksklusif) {
    data.push({
      label:
        satuan === "hari"
          ? `${kursor.getDate()} ${NAMA_BULAN[kursor.getMonth()]}`
          : `${NAMA_BULAN[kursor.getMonth()]} ${kursor.getFullYear()}`,
      jumlah: hitungan.get(kunci(kursor)) ?? 0,
    });
    if (satuan === "hari") kursor.setDate(kursor.getDate() + 1);
    else kursor.setMonth(kursor.getMonth() + 1);
  }

  return { satuan, data };
}

function urutkan(data: Distribusi) {
  return data.filter((d) => d.jumlah > 0).sort((a, b) => b.jumlah - a.jumlah);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (session.user.role !== "SATGAS") {
    return NextResponse.json(
      {
        success: false,
        message: "Hanya Satgas PPKS yang dapat mengakses dashboard monitoring.",
      },
      { status: 403 }
    );
  }

  const params = request.nextUrl.searchParams;
  const dari = parseTanggal(params.get("dari"));
  const sampai = parseTanggal(params.get("sampai"));

  if (!dari || !sampai || dari > sampai) {
    return NextResponse.json(
      {
        success: false,
        message: "Periode tidak valid. Gunakan format tanggal YYYY-MM-DD.",
      },
      { status: 400 }
    );
  }

  const akhirEksklusif = new Date(sampai);
  akhirEksklusif.setDate(akhirEksklusif.getDate() + 1);
  const panjangHari = Math.round(
    (akhirEksklusif.getTime() - dari.getTime()) / HARI_MS
  );

  if (panjangHari > MAKS_RENTANG_HARI) {
    return NextResponse.json(
      { success: false, message: "Rentang periode maksimal 5 tahun." },
      { status: 400 }
    );
  }

  if (PAKAI_DATA_DUMMY) {
    return NextResponse.json({
      success: true,
      data: buatDashboardDummy(dari, akhirEksklusif, {
        dari: params.get("dari")!,
        sampai: params.get("sampai")!,
      }),
    });
  }

  const awalSebelumnya = new Date(dari);
  awalSebelumnya.setDate(awalSebelumnya.getDate() - panjangHari);

  const where = { createdAt: { gte: dari, lt: akhirEksklusif } };

  try {
    const queryStatus = prisma.laporan.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });
    const queryKategori = prisma.laporan.groupBy({
      by: ["kategoriId"],
      where,
      _count: { _all: true },
    });
    const queryLokasi = prisma.laporan.groupBy({
      by: ["lokasiId"],
      where,
      _count: { _all: true },
    });
    const queryWaktu = prisma.laporan.findMany({
      where,
      select: { createdAt: true },
    });
    const querySebelumnya = prisma.laporan.count({
      where: { createdAt: { gte: awalSebelumnya, lt: dari } },
    });
    const queryUrgensiTinggi = prisma.laporan.count({
      where: {
        ...where,
        status: "DITERIMA",
        tingkatUrgensi: { in: ["TINGGI", "DARURAT"] },
      },
    });
    const queryTerbaru = prisma.laporan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        idLaporan: true,
        nomorKasus: true,
        tingkatUrgensi: true,
        status: true,
        createdAt: true,
        kategori: { select: { nama: true } },
        lokasi: { select: { namaGedung: true } },
      },
    });
    const queryAlert = prisma.incidentAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        idIncident: true,
        statusVerifikasi: true,
        deteksiAI: {
          select: {
            waktuDeteksi: true,
            confidenceScore: true,
            cctv: {
              select: {
                kodeKamera: true,
                posisi: true,
                lokasi: { select: { namaGedung: true } },
              },
            },
          },
        },
      },
    });
    const queryAktivitas = prisma.riwayatPenanganan.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        idRiwayat: true,
        jenisAktivitas: true,
        catatan: true,
        createdAt: true,
        laporan: { select: { nomorKasus: true } },
        satgas: { select: { nama: true } },
      },
    });

    const [
      perStatus,
      perKategori,
      perLokasi,
      waktuLaporan,
      masukSebelumnya,
      urgensiTinggi,
      terbaru,
      alerts,
      aktivitas,
    ] = (await Promise.all([
      queryStatus,
      queryKategori,
      queryLokasi,
      queryWaktu,
      querySebelumnya,
      queryUrgensiTinggi,
      queryTerbaru,
      queryAlert,
      queryAktivitas,
    ])) as [
      { status: string; _count: { _all: number } }[],
      { kategoriId: string; _count: { _all: number } }[],
      { lokasiId: string; _count: { _all: number } }[],
      { createdAt: Date }[],
      number,
      number,
      {
        idLaporan: string;
        nomorKasus: string;
        tingkatUrgensi: string;
        status: string;
        createdAt: Date;
        kategori: { nama: string };
        lokasi: { namaGedung: string };
      }[],
      {
        idIncident: string;
        statusVerifikasi: string;
        deteksiAI: {
          waktuDeteksi: Date;
          confidenceScore: unknown;
          cctv: {
            kodeKamera: string;
            posisi: string;
            lokasi: { namaGedung: string };
          };
        };
      }[],
      {
        idRiwayat: string;
        jenisAktivitas: string;
        catatan: string | null;
        createdAt: Date;
        laporan: { nomorKasus: string };
        satgas: { nama: string };
      }[],
    ];

    const [kategoriList, lokasiList] = (await Promise.all([
      prisma.kategoriKasus.findMany({
        where: { idKategori: { in: perKategori.map((k) => k.kategoriId) } },
        select: { idKategori: true, nama: true },
      }),
      prisma.lokasi.findMany({
        where: { idLokasi: { in: perLokasi.map((l) => l.lokasiId) } },
        select: { idLokasi: true, namaGedung: true },
      }),
    ])) as [
      { idKategori: string; nama: string }[],
      { idLokasi: string; namaGedung: string }[],
    ];

    const jumlahStatus = (...status: string[]) =>
      perStatus
        .filter((s) => status.includes(s.status))
        .reduce((total, s) => total + s._count._all, 0);

    const namaKategori = new Map(
      kategoriList.map((k) => [k.idKategori, k.nama])
    );
    const namaLokasi = new Map(
      lokasiList.map((l) => [l.idLokasi, l.namaGedung])
    );

    const data: DashboardMonitoringData = {
      periode: {
        dari: params.get("dari")!,
        sampai: params.get("sampai")!,
      },
      ringkasan: {
        masuk: waktuLaporan.length,
        masukPeriodeSebelumnya: masukSebelumnya,
        perluVerifikasi: jumlahStatus("DITERIMA"),
        perluVerifikasiUrgensiTinggi: urgensiTinggi,
        sedangDitangani: jumlahStatus("DIVERIFIKASI", "DITANGANI"),
        diverifikasi: jumlahStatus("DIVERIFIKASI"),
        ditangani: jumlahStatus("DITANGANI"),
        selesai: jumlahStatus("SELESAI", "TIDAK_VALID"),
      },
      distribusi: {
        status: urutkan(
          Object.keys(LABEL_STATUS).map((s) => ({
            nama: LABEL_STATUS[s],
            jumlah: jumlahStatus(s),
          }))
        ),
        kategori: urutkan(
          perKategori.map((k) => ({
            nama: namaKategori.get(k.kategoriId) ?? "Tanpa kategori",
            jumlah: k._count._all,
          }))
        ),
        lokasi: urutkan(
          perLokasi.map((l) => ({
            nama: namaLokasi.get(l.lokasiId) ?? "Tanpa lokasi",
            jumlah: l._count._all,
          }))
        ),
      },
      tren: buatTren(
        waktuLaporan.map((l) => l.createdAt),
        dari,
        akhirEksklusif
      ),
      laporanTerbaru: terbaru.map((l) => ({
        idLaporan: l.idLaporan,
        nomorKasus: l.nomorKasus,
        kategori: l.kategori.nama,
        lokasi: l.lokasi.namaGedung,
        tingkatUrgensi: l.tingkatUrgensi,
        status: l.status,
        createdAt: l.createdAt.toISOString(),
      })),
      incidentAlert: alerts.map((a) => ({
        idIncident: a.idIncident,
        kodeKamera: a.deteksiAI.cctv.kodeKamera,
        lokasi: `${a.deteksiAI.cctv.lokasi.namaGedung} · ${a.deteksiAI.cctv.posisi}`,
        waktuDeteksi: a.deteksiAI.waktuDeteksi.toISOString(),
        confidence: Number(String(a.deteksiAI.confidenceScore)),
        statusVerifikasi: a.statusVerifikasi,
      })),
      aktivitasTerbaru: aktivitas.map((r) => ({
        idRiwayat: r.idRiwayat,
        jenisAktivitas: r.jenisAktivitas,
        nomorKasus: r.laporan.nomorKasus,
        petugas: r.satgas.nama,
        catatan: r.catatan,
        createdAt: r.createdAt.toISOString(),
      })),
      diperbaruiPada: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[DASHBOARD_SATGAS] Gagal mengambil data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data dashboard.",
      },
      { status: 500 }
    );
  }
}
