import type { DashboardMonitoringData } from "./route";

// Data dummy sementara untuk pratinjau dashboard; tidak menyentuh database.

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const KATEGORI = [
  "Pelecehan Verbal / Catcalling",
  "Kekerasan Berbasis Elektronik (KSBE)",
  "Kekerasan Seksual Fisik",
  "Intimidasi & Penyalahgunaan Relasi Kuasa",
  "Penguntitan (Stalking)",
];
const LOKASI = [
  "Gedung Kuliah Bersama (Damar)",
  "Asrama Putri Tower A",
  "Kantin Terbuka (Kantin Barat)",
  "Telkom University Open Library",
  "Gedung Deli",
  "Gedung Cacuk Gunawan",
];
const URGENSI = ["RENDAH", "SEDANG", "TINGGI", "DARURAT"];
const LABEL_STATUS: Record<string, string> = {
  DITERIMA: "Diterima",
  DIVERIFIKASI: "Diverifikasi",
  DITANGANI: "Ditangani",
  SELESAI: "Selesai",
  TIDAK_VALID: "Tidak Valid",
};

type LaporanDummy = {
  idLaporan: string;
  nomorKasus: string;
  kategori: string;
  lokasi: string;
  tingkatUrgensi: string;
  status: string;
  createdAt: Date;
};

function acak(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pilihBerbobot<T>(rand: () => number, item: T[], bobot: number[]) {
  const total = bobot.reduce((a, b) => a + b, 0);
  let x = rand() * total;
  for (let i = 0; i < item.length; i++) {
    x -= bobot[i];
    if (x < 0) return item[i];
  }
  return item[item.length - 1];
}

function buatLaporanDummy(sekarang: Date): LaporanDummy[] {
  const rand = acak(20261030);
  const awal = new Date(2025, 0, 1).getTime();
  const rentang = sekarang.getTime() - awal;
  const hasil: LaporanDummy[] = [];

  for (let i = 0; i < 180; i++) {
    const createdAt = new Date(awal + Math.pow(rand(), 0.8) * rentang);
    const umurHari = (sekarang.getTime() - createdAt.getTime()) / 86_400_000;
    const status =
      umurHari < 7
        ? pilihBerbobot(rand, ["DITERIMA", "DIVERIFIKASI", "DITANGANI"], [6, 3, 1])
        : umurHari < 45
          ? pilihBerbobot(rand, ["DITERIMA", "DIVERIFIKASI", "DITANGANI", "SELESAI", "TIDAK_VALID"], [1, 3, 4, 2, 1])
          : pilihBerbobot(rand, ["DITANGANI", "SELESAI", "TIDAK_VALID"], [1, 8, 1]);

    hasil.push({
      idLaporan: `dummy-${i}`,
      nomorKasus: "",
      kategori: pilihBerbobot(rand, KATEGORI, [9, 7, 5, 3, 4]),
      lokasi: pilihBerbobot(rand, LOKASI, [8, 6, 5, 4, 3, 2]),
      tingkatUrgensi: pilihBerbobot(rand, URGENSI, [3, 5, 3, 1]),
      status,
      createdAt,
    });
  }

  hasil.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  hasil.forEach((l, i) => {
    const d = l.createdAt;
    l.nomorKasus = `SS-${d.getFullYear()}-${String(i + 1).padStart(3, "0")}`;
  });
  return hasil;
}

function hitung<T>(daftar: T[], kunci: (x: T) => string) {
  const peta = new Map<string, number>();
  for (const x of daftar) peta.set(kunci(x), (peta.get(kunci(x)) ?? 0) + 1);
  return [...peta.entries()]
    .map(([nama, jumlah]) => ({ nama, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

function buatTren(daftarTanggal: Date[], awal: Date, akhirEksklusif: Date) {
  const jumlahHari = Math.round((akhirEksklusif.getTime() - awal.getTime()) / 86_400_000);
  const satuan: "hari" | "bulan" = jumlahHari <= 62 ? "hari" : "bulan";
  const kunci = (t: Date) =>
    satuan === "hari"
      ? `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
      : `${t.getFullYear()}-${t.getMonth()}`;

  const hitungan = new Map<string, number>();
  for (const t of daftarTanggal) hitungan.set(kunci(t), (hitungan.get(kunci(t)) ?? 0) + 1);

  const data: { label: string; jumlah: number }[] = [];
  const kursor = satuan === "hari" ? new Date(awal) : new Date(awal.getFullYear(), awal.getMonth(), 1);
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

export function buatDashboardDummy(
  dari: Date,
  akhirEksklusif: Date,
  periode: { dari: string; sampai: string }
): DashboardMonitoringData {
  const sekarang = new Date();
  const semua = buatLaporanDummy(sekarang);
  const panjang = akhirEksklusif.getTime() - dari.getTime();
  const awalSebelumnya = new Date(dari.getTime() - panjang);

  const dalam = semua.filter((l) => l.createdAt >= dari && l.createdAt < akhirEksklusif);
  const sebelumnya = semua.filter((l) => l.createdAt >= awalSebelumnya && l.createdAt < dari);
  const jumlah = (...status: string[]) => dalam.filter((l) => status.includes(l.status)).length;

  const menit = (n: number) => new Date(sekarang.getTime() - n * 60_000).toISOString();

  return {
    periode,
    ringkasan: {
      masuk: dalam.length,
      masukPeriodeSebelumnya: sebelumnya.length,
      perluVerifikasi: jumlah("DITERIMA"),
      perluVerifikasiUrgensiTinggi: dalam.filter(
        (l) => l.status === "DITERIMA" && ["TINGGI", "DARURAT"].includes(l.tingkatUrgensi)
      ).length,
      sedangDitangani: jumlah("DIVERIFIKASI", "DITANGANI"),
      diverifikasi: jumlah("DIVERIFIKASI"),
      ditangani: jumlah("DITANGANI"),
      selesai: jumlah("SELESAI", "TIDAK_VALID"),
    },
    distribusi: {
      status: hitung(dalam, (l) => LABEL_STATUS[l.status]),
      kategori: hitung(dalam, (l) => l.kategori),
      lokasi: hitung(dalam, (l) => l.lokasi),
    },
    tren: buatTren(dalam.map((l) => l.createdAt), dari, akhirEksklusif),
    laporanTerbaru: dalam
      .slice(-5)
      .reverse()
      .map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    incidentAlert: [
      { idIncident: "dummy-a1", kodeKamera: "CCTV-GKU-07", lokasi: "Gedung Kuliah Bersama (Damar) · Selasar Lantai 2", waktuDeteksi: menit(18), confidence: 0.89, statusVerifikasi: "PENDING" },
      { idIncident: "dummy-a2", kodeKamera: "CCTV-ASR-12", lokasi: "Asrama Putri Tower A · Lobi Utama", waktuDeteksi: menit(140), confidence: 0.82, statusVerifikasi: "PENDING" },
      { idIncident: "dummy-a3", kodeKamera: "CCTV-PKR-03", lokasi: "Gedung Cacuk Gunawan · Area Parkir", waktuDeteksi: menit(1500), confidence: 0.76, statusVerifikasi: "TERVERIFIKASI" },
    ],
    aktivitasTerbaru: [
      { idRiwayat: "dummy-r1", jenisAktivitas: "Penanganan kasus dimulai", nomorKasus: semua.at(-1)!.nomorKasus, petugas: "Satgas PPKS Tel-U", catatan: null, createdAt: menit(12) },
      { idRiwayat: "dummy-r2", jenisAktivitas: "Status kasus diperbarui", nomorKasus: semua.at(-2)!.nomorKasus, petugas: "Satgas PPKS Tel-U", catatan: null, createdAt: menit(45) },
      { idRiwayat: "dummy-r3", jenisAktivitas: "Bukti CCTV ditambahkan", nomorKasus: semua.at(-4)!.nomorKasus, petugas: "Satgas PPKS Tel-U", catatan: null, createdAt: menit(130) },
      { idRiwayat: "dummy-r4", jenisAktivitas: "Hasil pemeriksaan dicatat", nomorKasus: semua.at(-7)!.nomorKasus, petugas: "Satgas PPKS Tel-U", catatan: null, createdAt: menit(260) },
    ],
    diperbaruiPada: sekarang.toISOString(),
    dummy: true,
  };
}
