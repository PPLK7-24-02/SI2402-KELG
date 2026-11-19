import { after, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { existsSync } from "node:fs";

/* ------------------------------------------------------------------ */
/* 1. Hook resolusi modul (agar Node bisa membaca alias "@/" dan import */
/*    tanpa ekstensi seperti yang dipakai Next.js).                     */
/* ------------------------------------------------------------------ */

type HasilResolve = { url: string; format?: string | null; shortCircuit?: boolean };
type KonteksResolve = { parentURL?: string; conditions?: string[] };
type RegisterHooks = (hooks: {
  resolve?: (
    specifier: string,
    context: KonteksResolve,
    nextResolve: (specifier: string, context?: KonteksResolve) => HasilResolve
  ) => HasilResolve;
}) => unknown;

const registerHooks = (nodeModule as unknown as { registerHooks?: RegisterHooks }).registerHooks;
if (typeof registerHooks !== "function") {
  throw new Error("Butuh Node.js >= 22.15 (module.registerHooks).");
}
if (typeof (mock as unknown as { module?: unknown }).module !== "function") {
  throw new Error("Jalankan dengan flag --experimental-test-module-mocks.");
}

const ROOT_PROYEK = new URL("../../../", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    let s = specifier;
    if (s === "next/server") s = "next/server.js";
    if (s.startsWith("@/")) s = ROOT_PROYEK + s.slice(2);

    const relatif = s.startsWith("./") || s.startsWith("../") || s.startsWith("file:");
    if (relatif && !/\.[cm]?[jt]sx?$/.test(s)) {
      const dasar = new URL(s, context.parentURL ?? ROOT_PROYEK);
      if (existsSync(new URL(dasar.href + ".ts"))) s = dasar.href + ".ts";
    }

    return nextResolve(s, context);
  },
});

/* ------------------------------------------------------------------ */
/* 2. Mock next-auth, authOptions, dan Prisma                           */
/*    (database asli tidak disentuh sama sekali)                        */
/* ------------------------------------------------------------------ */

type Sesi = { user: { id?: string; role?: string } } | null;
let sesiAktif: Sesi = null;

type Skenario = {
  perStatus: { status: string; _count: { _all: number } }[];
  perKategori: { kategoriId: string; _count: { _all: number } }[];
  perLokasi: { lokasiId: string; _count: { _all: number } }[];
  waktuLaporan: { createdAt: Date }[];
  masukSebelumnya: number;
  urgensiTinggi: number;
  terbaru: {
    idLaporan: string;
    nomorKasus: string;
    tingkatUrgensi: string;
    status: string;
    createdAt: Date;
    kategori: { nama: string };
    lokasi: { namaGedung: string };
  }[];
  alerts: {
    idIncident: string;
    statusVerifikasi: string;
    deteksiAI: {
      waktuDeteksi: Date;
      confidenceScore: unknown;
      cctv: { kodeKamera: string; posisi: string; lokasi: { namaGedung: string } };
    };
  }[];
  aktivitas: {
    idRiwayat: string;
    jenisAktivitas: string;
    catatan: string | null;
    createdAt: Date;
    laporan: { nomorKasus: string };
    satgas: { nama: string };
  }[];
  kategoriList: { idKategori: string; nama: string }[];
  lokasiList: { idLokasi: string; namaGedung: string }[];
  error: Error | null;
};

function skenarioKosong(): Skenario {
  return {
    perStatus: [],
    perKategori: [],
    perLokasi: [],
    waktuLaporan: [],
    masukSebelumnya: 0,
    urgensiTinggi: 0,
    terbaru: [],
    alerts: [],
    aktivitas: [],
    kategoriList: [],
    lokasiList: [],
    error: null,
  };
}

let skenario: Skenario = skenarioKosong();

// Catatan argumen yang diterima Prisma, untuk memeriksa filter periode (TC-04).
type ArgQuery = { by?: string[]; where?: Record<string, unknown>; take?: number };
const panggilan: { model: string; method: string; args: ArgQuery }[] = [];

function catat<T>(model: string, method: string, args: ArgQuery, hasil: () => T): Promise<T> {
  panggilan.push({ model, method, args });
  if (skenario.error) return Promise.reject(skenario.error);
  return Promise.resolve(hasil());
}

const prismaMock = {
  laporan: {
    groupBy: (args: ArgQuery) =>
      catat("laporan", "groupBy", args, () => {
        const kolom = args.by?.[0];
        if (kolom === "status") return skenario.perStatus;
        if (kolom === "kategoriId") return skenario.perKategori;
        return skenario.perLokasi;
      }),
    findMany: (args: ArgQuery) =>
      catat("laporan", "findMany", args, () => (args.take ? skenario.terbaru : skenario.waktuLaporan)),
    count: (args: ArgQuery) =>
      catat("laporan", "count", args, () =>
        args.where && "status" in args.where ? skenario.urgensiTinggi : skenario.masukSebelumnya
      ),
  },
  incidentAlert: {
    findMany: (args: ArgQuery) => catat("incidentAlert", "findMany", args, () => skenario.alerts),
  },
  riwayatPenanganan: {
    findMany: (args: ArgQuery) => catat("riwayatPenanganan", "findMany", args, () => skenario.aktivitas),
  },
  kategoriKasus: {
    findMany: (args: ArgQuery) => catat("kategoriKasus", "findMany", args, () => skenario.kategoriList),
  },
  lokasi: {
    findMany: (args: ArgQuery) => catat("lokasi", "findMany", args, () => skenario.lokasiList),
  },
};

mock.module("next-auth", { namedExports: { getServerSession: async () => sesiAktif } });
mock.module("@/lib/auth", { namedExports: { authOptions: {} } });
mock.module("@/lib/prisma", { defaultExport: prismaMock });

/* ------------------------------------------------------------------ */
/* 3. Import modul yang diuji (setelah hook & mock aktif)               */
/* ------------------------------------------------------------------ */

const { NextRequest } = await import("next/server");
const { GET } = await import("../../api/satgas-ppks/dashboard/route");

type DataDashboard = {
  periode: { dari: string; sampai: string };
  ringkasan: Record<string, number>;
  distribusi: Record<"status" | "kategori" | "lokasi", { nama: string; jumlah: number }[]>;
  tren: { satuan: "hari" | "bulan"; data: { label: string; jumlah: number }[] };
  laporanTerbaru: { idLaporan: string; createdAt: string; kategori: string; lokasi: string }[];
  incidentAlert: { idIncident: string; kodeKamera: string; lokasi: string; waktuDeteksi: string; confidence: number }[];
  aktivitasTerbaru: { idRiwayat: string; nomorKasus: string; petugas: string; catatan: string | null; createdAt: string }[];
  diperbaruiPada: string;
};
type Respons = { status: number; body: { success: boolean; message?: string; data?: DataDashboard } };

async function panggil(query: Record<string, string | undefined>): Promise<Respons> {
  const url = new URL("http://localhost/api/satgas-ppks/dashboard");
  for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, v);
  const res = await GET(new NextRequest(url));
  return { status: res.status, body: await res.json() };
}

const SATGAS: Sesi = { user: { id: "1", role: "SATGAS" } };
const NOV_2026 = { dari: "2026-11-01", sampai: "2026-11-30" };
const jumlahkan = (d: { jumlah: number }[]) => d.reduce((t, x) => t + x.jumlah, 0);

beforeEach(() => {
  sesiAktif = SATGAS;
  skenario = skenarioKosong();
  panggilan.length = 0;
});

/* ================================================================== */
/* TC-06  Hak akses — percabangan D1 dan D2 (baris 135 & 142)           */
/* ================================================================== */
describe("TC-06 Hak akses dashboard (D1, D2)", () => {
  test("TC-06a Belum login (session null) -> 401 [D1 TRUE]", async () => {
    // Jalur 1: session tidak ada sama sekali.
    sesiAktif = null;
    const r = await panggil(NOV_2026);
    assert.equal(r.status, 401);
    assert.equal(r.body.message, "Silakan login terlebih dahulu.");
    assert.equal(panggilan.length, 0, "Database tidak boleh di-query");
  });

  test("TC-06b Session ada tetapi tanpa id user -> 401 [D1 TRUE, cabang optional chaining]", async () => {
    // session.user ada, tetapi id kosong.
    sesiAktif = { user: { role: "SATGAS" } };
    const r = await panggil(NOV_2026);
    assert.equal(r.status, 401);
  });

  test("TC-06c Login sebagai PELAPOR -> 403 [D1 FALSE, D2 TRUE]", async () => {
    // Jalur 2: login valid tetapi bukan Satgas.
    sesiAktif = { user: { id: "9", role: "PELAPOR" } };
    const r = await panggil(NOV_2026);
    assert.equal(r.status, 403);
    assert.equal(r.body.message, "Hanya Satgas PPKS yang dapat mengakses dashboard monitoring.");
  });

  test("TC-06d Login sebagai SATGAS -> lolos ke validasi periode [D2 FALSE]", async () => {
    // Satgas tidak ditolak oleh pemeriksaan role.
    const r = await panggil(NOV_2026);
    assert.equal(r.status, 200);
  });
});

/* ================================================================== */
/* TC-04  Filter periode — D3 (baris 156), D4 (baris 172),              */
/*        parseTanggal (baris 76-83), filter where Prisma (baris 182)   */
/* ================================================================== */
describe("TC-04 Validasi dan filter rentang periode", () => {
  test("TC-04a Parameter 'dari' tidak dikirim -> 400 [parseTanggal: !nilai TRUE; D3 cond-1 TRUE]", async () => {
    // Kondisi !dari bernilai TRUE.
    const r = await panggil({ sampai: "2026-11-30" });
    assert.equal(r.status, 400);
    assert.equal(r.body.message, "Periode tidak valid. Gunakan format tanggal YYYY-MM-DD.");
  });

  test("TC-04b Format 'sampai' salah (2026/11/30) -> 400 [regex FALSE; D3 cond-2 TRUE]", async () => {
    // Kondisi !dari FALSE, !sampai TRUE karena format tidak sesuai regex.
    const r = await panggil({ dari: "2026-11-01", sampai: "2026/11/30" });
    assert.equal(r.status, 400);
  });

  test("TC-04c Tanggal tidak ada di kalender (2026-02-30) -> 400 [parseTanggal baris 80 FALSE]", async () => {
    // Format benar, tetapi 30 Februari bergeser menjadi 2 Maret sehingga ditolak.
    const r = await panggil({ dari: "2026-02-01", sampai: "2026-02-30" });
    assert.equal(r.status, 400);
  });

  test("TC-04d 'dari' lebih besar dari 'sampai' -> 400 [D3 cond-3 TRUE]", async () => {
    // Kedua tanggal valid, tetapi urutannya terbalik.
    const r = await panggil({ dari: "2026-11-30", sampai: "2026-11-01" });
    assert.equal(r.status, 400);
  });

  test("TC-04e 'dari' sama dengan 'sampai' (1 hari) -> 200 [D3 semua kondisi FALSE, batas bawah]", async () => {
    // Batas: periode 1 hari tetap valid dan tren berisi 1 titik.
    const r = await panggil({ dari: "2026-11-17", sampai: "2026-11-17" });
    assert.equal(r.status, 200);
    assert.equal(r.body.data?.tren.data.length, 1);
    assert.equal(r.body.data?.tren.data[0].label, "17 Nov");
  });

  test("TC-04f Rentang tepat 1830 hari -> 200 [D4 FALSE, nilai batas]", async () => {
    // 2021-01-01 s/d 2026-01-04 = 1830 hari (batas maksimal MAKS_RENTANG_HARI).
    const r = await panggil({ dari: "2021-01-01", sampai: "2026-01-04" });
    assert.equal(r.status, 200);
  });

  test("TC-04g Rentang 1831 hari -> 400 [D4 TRUE, batas + 1]", async () => {
    // Satu hari melewati batas 5 tahun.
    const r = await panggil({ dari: "2021-01-01", sampai: "2026-01-05" });
    assert.equal(r.status, 400);
    assert.equal(r.body.message, "Rentang periode maksimal 5 tahun.");
  });

  test("TC-04h Filter Prisma memakai createdAt >= dari dan < (sampai + 1 hari)", async () => {
    // Memastikan periode benar-benar diteruskan sebagai filter query (baris 166-167 dan 182).
    await panggil(NOV_2026);
    const groupStatus = panggilan.find((p) => p.method === "groupBy" && p.args.by?.[0] === "status");
    const createdAt = groupStatus?.args.where?.createdAt as { gte: Date; lt: Date };
    assert.deepEqual(createdAt.gte, new Date(2026, 10, 1));
    assert.deepEqual(createdAt.lt, new Date(2026, 11, 1));
  });

  test("TC-04i Periode sebelumnya dihitung mundur sepanjang periode yang dipilih (baris 179-180, 204-206)", async () => {
    // November (30 hari) -> periode pembanding 2 Okt s/d 31 Okt.
    await panggil(NOV_2026);
    const hitungSebelumnya = panggilan.find(
      (p) => p.method === "count" && p.args.where && !("status" in p.args.where)
    );
    const createdAt = hitungSebelumnya?.args.where?.createdAt as { gte: Date; lt: Date };
    assert.deepEqual(createdAt.gte, new Date(2026, 9, 2));
    assert.deepEqual(createdAt.lt, new Date(2026, 10, 1));
  });

  test("TC-04j Rentang 62 hari -> tren per HARI [buatTren baris 98 TRUE, nilai batas]", async () => {
    // 1 Jan s/d 3 Mar 2026 = 62 hari.
    const r = await panggil({ dari: "2026-01-01", sampai: "2026-03-03" });
    assert.equal(r.body.data?.tren.satuan, "hari");
    assert.equal(r.body.data?.tren.data.length, 62);
    assert.equal(r.body.data?.tren.data[0].label, "1 Jan");
    assert.equal(r.body.data?.tren.data[61].label, "3 Mar");
  });

  test("TC-04k Rentang 63 hari -> tren per BULAN [buatTren baris 98 FALSE, batas + 1]", async () => {
    // 1 Jan s/d 4 Mar 2026 = 63 hari -> dikelompokkan per bulan.
    const r = await panggil({ dari: "2026-01-01", sampai: "2026-03-04" });
    assert.equal(r.body.data?.tren.satuan, "bulan");
    assert.deepEqual(
      r.body.data?.tren.data.map((d) => d.label),
      ["Jan 2026", "Feb 2026", "Mar 2026"]
    );
  });

  test("TC-04l Laporan dimasukkan ke titik tren yang sesuai tanggal/bulannya", async () => {
    // Loop penghitungan (baris 102-105) dan pengambilan nilai (baris 119) dengan data.
    skenario.waktuLaporan = [
      { createdAt: new Date(2026, 10, 2, 9) },
      { createdAt: new Date(2026, 10, 2, 15) },
      { createdAt: new Date(2026, 10, 30, 23) },
    ];
    const harian = await panggil(NOV_2026);
    const tren = harian.body.data!.tren.data;
    assert.equal(tren.find((d) => d.label === "2 Nov")?.jumlah, 2);
    assert.equal(tren.find((d) => d.label === "30 Nov")?.jumlah, 1);
    assert.equal(tren.find((d) => d.label === "1 Nov")?.jumlah, 0);

    const bulanan = await panggil({ dari: "2026-01-01", sampai: "2026-12-31" });
    assert.equal(bulanan.body.data?.tren.satuan, "bulan");
    assert.equal(bulanan.body.data?.tren.data.find((d) => d.label === "Nov 2026")?.jumlah, 3);
    assert.equal(jumlahkan(bulanan.body.data!.tren.data), 3);
  });
});

/* ================================================================== */
/* TC-01  Jumlah seluruh laporan (baris 353-354)                        */
/* ================================================================== */
describe("TC-01 Perhitungan jumlah seluruh laporan", () => {
  test("TC-01a 'masuk' sama dengan jumlah laporan pada periode", async () => {
    // 5 laporan pada periode -> ringkasan.masuk = 5.
    skenario.waktuLaporan = [1, 3, 5, 7, 9].map((h) => ({ createdAt: new Date(2026, 10, h) }));
    skenario.masukSebelumnya = 3;
    const r = await panggil(NOV_2026);
    assert.equal(r.status, 200);
    assert.equal(r.body.data?.ringkasan.masuk, 5);
    assert.equal(r.body.data?.ringkasan.masukPeriodeSebelumnya, 3);
  });

  test("TC-01b Respons berisi periode yang diminta dan waktu pembaruan data", async () => {
    // Statement pembentukan objek periode & diperbaruiPada (baris 347-350, 412).
    const r = await panggil(NOV_2026);
    assert.deepEqual(r.body.data?.periode, NOV_2026);
    assert.ok(!Number.isNaN(Date.parse(r.body.data!.diperbaruiPada)));
  });
});

/* ================================================================== */
/* TC-02  Pengelompokan berdasarkan status (jumlahStatus, urutkan)      */
/* ================================================================== */
describe("TC-02 Pengelompokan laporan berdasarkan status", () => {
  test("TC-02a Ringkasan status dihitung dari hasil groupBy", async () => {
    // Setiap status dijumlahkan sesuai aturan di baris 355-360.
    skenario.perStatus = [
      { status: "DITERIMA", _count: { _all: 2 } },
      { status: "DIVERIFIKASI", _count: { _all: 1 } },
      { status: "DITANGANI", _count: { _all: 3 } },
      { status: "SELESAI", _count: { _all: 4 } },
      { status: "TIDAK_VALID", _count: { _all: 1 } },
    ];
    skenario.urgensiTinggi = 1;
    const r = await panggil(NOV_2026);
    const ringkasan = r.body.data!.ringkasan;
    assert.equal(ringkasan.perluVerifikasi, 2);
    assert.equal(ringkasan.perluVerifikasiUrgensiTinggi, 1);
    assert.equal(ringkasan.sedangDitangani, 4); // DIVERIFIKASI + DITANGANI
    assert.equal(ringkasan.diverifikasi, 1);
    assert.equal(ringkasan.ditangani, 3);
    assert.equal(ringkasan.selesai, 5); // SELESAI + TIDAK_VALID
  });

  test("TC-02b Distribusi status diberi label dan diurutkan dari jumlah terbesar", async () => {
    // urutkan(): sort menurun; jumlah sama mempertahankan urutan LABEL_STATUS.
    skenario.perStatus = [
      { status: "DITERIMA", _count: { _all: 2 } },
      { status: "DIVERIFIKASI", _count: { _all: 1 } },
      { status: "DITANGANI", _count: { _all: 3 } },
      { status: "SELESAI", _count: { _all: 4 } },
      { status: "TIDAK_VALID", _count: { _all: 1 } },
    ];
    const r = await panggil(NOV_2026);
    assert.deepEqual(r.body.data?.distribusi.status, [
      { nama: "Selesai", jumlah: 4 },
      { nama: "Ditangani", jumlah: 3 },
      { nama: "Diterima", jumlah: 2 },
      { nama: "Diverifikasi", jumlah: 1 },
      { nama: "Tidak Valid", jumlah: 1 },
    ]);
  });

  test("TC-02c Status berjumlah 0 dibuang dari distribusi [urutkan baris 129: jumlah > 0 FALSE]", async () => {
    // Hanya DITERIMA yang ada, empat status lain bernilai 0 dan harus disaring.
    skenario.perStatus = [{ status: "DITERIMA", _count: { _all: 6 } }];
    const r = await panggil(NOV_2026);
    assert.deepEqual(r.body.data?.distribusi.status, [{ nama: "Diterima", jumlah: 6 }]);
    assert.equal(r.body.data?.ringkasan.sedangDitangani, 0);
    assert.equal(r.body.data?.ringkasan.selesai, 0);
  });

  test("TC-02d Status di luar daftar resmi tidak ikut dihitung", async () => {
    // jumlahStatus (baris 335-338) hanya mencocokkan status yang diminta (filter includes FALSE).
    skenario.perStatus = [
      { status: "DITERIMA", _count: { _all: 1 } },
      { status: "STATUS_LAIN", _count: { _all: 9 } },
    ];
    const r = await panggil(NOV_2026);
    assert.equal(r.body.data?.ringkasan.perluVerifikasi, 1);
    assert.equal(jumlahkan(r.body.data!.distribusi.status), 1);
  });

  test("TC-02e Query urgensi tinggi memfilter status DITERIMA dengan urgensi TINGGI/DARURAT", async () => {
    // Memastikan kondisi query di baris 207-213.
    await panggil(NOV_2026);
    const q = panggilan.find((p) => p.method === "count" && p.args.where && "status" in p.args.where);
    assert.equal(q?.args.where?.status, "DITERIMA");
    assert.deepEqual(q?.args.where?.tingkatUrgensi, { in: ["TINGGI", "DARURAT"] });
  });
});

/* ================================================================== */
/* TC-03  Distribusi kategori kasus & lokasi (baris 369-380)            */
/* ================================================================== */
describe("TC-03 Distribusi laporan berdasarkan kategori kasus dan lokasi", () => {
  test("TC-03a Nama kategori ditemukan dan diurutkan [baris 371 ?? TRUE dan FALSE]", async () => {
    // k1 & k2 ada di tabel kategori; kX tidak ada -> 'Tanpa kategori'.
    skenario.perKategori = [
      { kategoriId: "k2", _count: { _all: 2 } },
      { kategoriId: "kX", _count: { _all: 1 } },
      { kategoriId: "k1", _count: { _all: 5 } },
    ];
    skenario.kategoriList = [
      { idKategori: "k1", nama: "Pelecehan Verbal" },
      { idKategori: "k2", nama: "KSBE" },
    ];
    const r = await panggil(NOV_2026);
    assert.deepEqual(r.body.data?.distribusi.kategori, [
      { nama: "Pelecehan Verbal", jumlah: 5 },
      { nama: "KSBE", jumlah: 2 },
      { nama: "Tanpa kategori", jumlah: 1 },
    ]);
  });

  test("TC-03b Nama kategori dicari hanya untuk id yang muncul di hasil groupBy", async () => {
    // Argumen query kategoriKasus.findMany (baris 322-325).
    skenario.perKategori = [
      { kategoriId: "k1", _count: { _all: 1 } },
      { kategoriId: "k2", _count: { _all: 1 } },
    ];
    await panggil(NOV_2026);
    const q = panggilan.find((p) => p.model === "kategoriKasus");
    assert.deepEqual(q?.args.where, { idKategori: { in: ["k1", "k2"] } });
  });

  test("TC-03c Distribusi lokasi memakai nama gedung, fallback 'Tanpa lokasi'", async () => {
    // Percabangan ?? di baris 377.
    skenario.perLokasi = [
      { lokasiId: "l1", _count: { _all: 4 } },
      { lokasiId: "lX", _count: { _all: 2 } },
    ];
    skenario.lokasiList = [{ idLokasi: "l1", namaGedung: "Gedung Damar" }];
    const r = await panggil(NOV_2026);
    assert.deepEqual(r.body.data?.distribusi.lokasi, [
      { nama: "Gedung Damar", jumlah: 4 },
      { nama: "Tanpa lokasi", jumlah: 2 },
    ]);
  });
});

/* ================================================================== */
/* TC-05  Data kosong                                                   */
/* ================================================================== */
describe("TC-05 Dashboard ketika data laporan kosong", () => {
  test("TC-05a Semua query kosong -> 200 dengan angka 0 dan daftar kosong", async () => {
    // Tidak ada laporan sama sekali; dashboard tetap berhasil dimuat.
    const r = await panggil(NOV_2026);
    const d = r.body.data!;
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    for (const nilai of Object.values(d.ringkasan)) assert.equal(nilai, 0);
    assert.deepEqual(d.distribusi, { status: [], kategori: [], lokasi: [] });
    assert.deepEqual(d.laporanTerbaru, []);
    assert.deepEqual(d.incidentAlert, []);
    assert.deepEqual(d.aktivitasTerbaru, []);
  });

  test("TC-05b Tren tetap berisi setiap hari dengan nilai 0 [loop for 0 iterasi, ?? 0 FALSE]", async () => {
    // November = 30 titik tren, semuanya 0.
    const r = await panggil(NOV_2026);
    assert.equal(r.body.data?.tren.data.length, 30);
    assert.ok(r.body.data?.tren.data.every((t) => t.jumlah === 0));
  });
});

/* ================================================================== */
/* TC-07  Pemetaan data terbaru dan kegagalan database (try/catch)      */
/* ================================================================== */
describe("TC-07 Pemetaan data detail dan penanganan error database", () => {
  test("TC-07a Laporan terbaru, incident alert, dan aktivitas dipetakan dengan benar", async () => {
    // Statement mapping di baris 387-411.
    const waktu = new Date(2026, 10, 10, 8, 30);
    skenario.terbaru = [
      {
        idLaporan: "L1",
        nomorKasus: "SS-2026-001",
        tingkatUrgensi: "TINGGI",
        status: "DITERIMA",
        createdAt: waktu,
        kategori: { nama: "KSBE" },
        lokasi: { namaGedung: "Gedung Deli" },
      },
    ];
    skenario.alerts = [
      {
        idIncident: "A1",
        statusVerifikasi: "PENDING",
        deteksiAI: {
          waktuDeteksi: waktu,
          confidenceScore: { toString: () => "0.89" }, // meniru tipe Decimal Prisma
          cctv: { kodeKamera: "CCTV-07", posisi: "Lobi", lokasi: { namaGedung: "Damar" } },
        },
      },
    ];
    skenario.aktivitas = [
      {
        idRiwayat: "R1",
        jenisAktivitas: "Status diperbarui",
        catatan: null,
        createdAt: waktu,
        laporan: { nomorKasus: "SS-2026-001" },
        satgas: { nama: "Satgas A" },
      },
    ];
    const r = await panggil(NOV_2026);
    const d = r.body.data!;
    assert.equal(d.laporanTerbaru[0].kategori, "KSBE");
    assert.equal(d.laporanTerbaru[0].lokasi, "Gedung Deli");
    assert.equal(d.laporanTerbaru[0].createdAt, waktu.toISOString());
    assert.equal(d.incidentAlert[0].lokasi, "Damar · Lobi");
    assert.equal(d.incidentAlert[0].confidence, 0.89);
    assert.equal(d.aktivitasTerbaru[0].nomorKasus, "SS-2026-001");
    assert.equal(d.aktivitasTerbaru[0].petugas, "Satgas A");
    assert.equal(d.aktivitasTerbaru[0].catatan, null);
  });

  test("TC-07b Database error -> 500 [D5 catch, baris 416]", async () => {
    // Jalur 6: salah satu query Prisma gagal.
    const consoleError = mock.method(console, "error", () => {});
    skenario.error = new Error("koneksi database terputus");
    const r = await panggil(NOV_2026);
    assert.equal(r.status, 500);
    assert.equal(r.body.success, false);
    assert.equal(r.body.message, "Terjadi kesalahan saat mengambil data dashboard.");
    assert.equal(consoleError.mock.callCount(), 1);
    consoleError.mock.restore();
  });
});

after(() => {
  mock.restoreAll();
});
