
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client.ts";

// ======================================================
// DATABASE CONFIGURATION
// ======================================================

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

// ======================================================
// HELPERS
// ======================================================

const now = new Date();

const hoursAgo = (hours) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

const daysAgo = (days) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const minutesAfter = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const casePeriod = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
}).format(now).replace("-", "");

// Upsert berdasarkan primary key.
// Update tidak mengubah primary key.
async function seedRecord(model, primaryKey, data) {
  const { [primaryKey]: id, ...updateData } = data;

  return model.upsert({
    where: { [primaryKey]: id },
    update: updateData,
    create: data,
  });
}

async function seedRecords(model, primaryKey, records) {
  for (const record of records) {
    await seedRecord(model, primaryKey, record);
  }
  return records.length;
}

const totals = {};

function logSeed(name, count) {
  totals[name] = count;
  console.log(`✅ ${name}: ${count} record`);
}

// ======================================================
// MAIN
// ======================================================

async function main() {
  console.log("\n========================================");
  console.log("🌱 SAFE SPACE DATABASE SEEDER");
  console.log("========================================\n");

  const defaultPasswordHash = await bcrypt.hash(
    "password123",
    10
  );

  // ====================================================
  // 1. SATGAS PPKS
  // ====================================================

  const satgasList = [
    {
      idSatgasPPKS: "satgas-001",
      nama: "Satgas PPKS Tel-U",
      email: "satgas@telkomuniversity.ac.id",
      passwordHash: defaultPasswordHash,
      noHp: "081234567890",
    },
    {
      idSatgasPPKS: "satgas-002",
      nama: "Admin Penanganan PPKS",
      email: "admin.ppks@telkomuniversity.ac.id",
      passwordHash: defaultPasswordHash,
      noHp: "081234567891",
    },
  ];

  logSeed(
    "SatgasPPKS",
    await seedRecords(
      prisma.satgasPPKS,
      "idSatgasPPKS",
      satgasList
    )
  );

  // ====================================================
  // 2. KATEGORI KASUS
  // ====================================================

  const kategoriList = [
    {
      idKategori: "kat-01",
      nama: "Kekerasan Seksual Fisik",
      deskripsi:
        "Sentuhan fisik tanpa persetujuan, pemaksaan kontak fisik, atau bentuk kekerasan seksual fisik lainnya.",
    },
    {
      idKategori: "kat-02",
      nama: "Kekerasan Berbasis Elektronik (KSBE)",
      deskripsi:
        "Pelecehan seksual melalui pesan elektronik, media sosial, panggilan, penyebaran konten pribadi, atau platform digital.",
    },
    {
      idKategori: "kat-03",
      nama: "Pelecehan Verbal / Catcalling",
      deskripsi:
        "Komentar seksual, siulan, lelucon tidak pantas, serta ucapan bernuansa seksual yang tidak dikehendaki.",
    },
    {
      idKategori: "kat-04",
      nama: "Intimidasi & Penyalahgunaan Relasi Kuasa",
      deskripsi:
        "Ancaman akademik atau pekerjaan, penyalahgunaan jabatan, dan pemaksaan melalui ketimpangan relasi kuasa.",
    },
    {
      idKategori: "kat-05",
      nama: "Penguntitan (Stalking)",
      deskripsi:
        "Perilaku mengikuti, mengawasi, menghubungi berulang kali, atau mengintimidasi seseorang tanpa persetujuan.",
    },
  ];

  logSeed(
    "KategoriKasus",
    await seedRecords(
      prisma.kategoriKasus,
      "idKategori",
      kategoriList
    )
  );

  // ====================================================
  // 3. LOKASI KAMPUS
  // ====================================================

  const lokasiList = [
    {
      idLokasi: "lok-kampus-bandung",
      namaGedung: "Kampus Telkom University Bandung",
      area: "Semua area kampus",
    },
    {
      idLokasi: "lok-kampus-jakarta",
      namaGedung: "Kampus Telkom University Jakarta",
      area: "Semua area kampus",
    },
    {
      idLokasi: "lok-kampus-purwokerto",
      namaGedung: "Kampus Telkom University Purwokerto",
      area: "Semua area kampus",
    },
    {
      idLokasi: "lok-kampus-surabaya",
      namaGedung: "Kampus Telkom University Surabaya",
      area: "Semua area kampus",
    },
  ];

  logSeed(
    "Lokasi",
    await seedRecords(
      prisma.lokasi,
      "idLokasi",
      lokasiList
    )
  );

  // ====================================================
  // 4. PELAPOR
  // ====================================================

  const pelaporList = [
    {
      idPelapor: "usr-01",
      nama: "Anisa Rahmawati",
      email: "anisa@student.telkomuniversity.ac.id",
      passwordHash: defaultPasswordHash,
      jenisPengguna: "MAHASISWA",
      nimNip: "1301210001",
      noHp: "081211112222",
    },
    {
      idPelapor: "usr-02",
      nama: "Dimas Prasetyo",
      email: "dimas@student.telkomuniversity.ac.id",
      passwordHash: defaultPasswordHash,
      jenisPengguna: "MAHASISWA",
      nimNip: "1301210002",
      noHp: "081233334444",
    },
    {
      idPelapor: "usr-03",
      nama: "Siti Nurhaliza",
      email: "siti@telkomuniversity.ac.id",
      passwordHash: defaultPasswordHash,
      jenisPengguna: "STAFF",
      nimNip: "19880101001",
      noHp: "081255556666",
    },
    {
      idPelapor: "usr-04",
      nama: "Dr. Ir. Hendra Saputra, M.T.",
      email: "hendra@telkomuniversity.ac.id",
      passwordHash: defaultPasswordHash,
      jenisPengguna: "DOSEN",
      nimNip: "19750505002",
      noHp: "081277778888",
    },
  ];

  logSeed(
    "Pelapor",
    await seedRecords(
      prisma.pelapor,
      "idPelapor",
      pelaporList
    )
  );

  // ====================================================
  // 5. CCTV
  // ====================================================

  // URL berikut hanya placeholder untuk testing database.
  // Ganti streamUrl dengan alamat RTSP/HTTP kamera asli
  // atau sumber video pengujian saat integrasi.

  const cctvList = [
    {
      idCCTV: "cctv-001",
      kodeKamera: "CAM-BDG-001",
      posisi: "Area Parkir Asrama Putri Tower A",
      streamUrl: "rtsp://127.0.0.1:8554/cam-bdg-001",
      isAktif: true,
      lokasiId: "lok-kampus-bandung",
    },
    {
      idCCTV: "cctv-002",
      kodeKamera: "CAM-BDG-002",
      posisi: "Selasar Gedung Damar",
      streamUrl: "rtsp://127.0.0.1:8554/cam-bdg-002",
      isAktif: true,
      lokasiId: "lok-kampus-bandung",
    },
    {
      idCCTV: "cctv-003",
      kodeKamera: "CAM-BDG-003",
      posisi: "Area Open Library",
      streamUrl: "rtsp://127.0.0.1:8554/cam-bdg-003",
      isAktif: true,
      lokasiId: "lok-kampus-bandung",
    },
    {
      idCCTV: "cctv-004",
      kodeKamera: "CAM-JKT-001",
      posisi: "Koridor Utama Kampus Jakarta",
      streamUrl: "rtsp://127.0.0.1:8554/cam-jkt-001",
      isAktif: false,
      lokasiId: "lok-kampus-jakarta",
    },
  ];

  logSeed(
    "CCTV",
    await seedRecords(
      prisma.cCTV,
      "idCCTV",
      cctvList
    )
  );

  // ====================================================
  // 6. LAPORAN
  // ====================================================

  const dummyKasus = [
    {
      idLaporan: "lap-001",
      nomorKasus: `EMG-${casePeriod}-001`,
      jenis: "EMERGENCY",
      kronologi:
        "Pelapor melaporkan dugaan sentuhan fisik tanpa persetujuan di area parkir belakang asrama pada malam hari.",
      keteranganTambahan:
        "Pelapor meminta bantuan segera dan pemeriksaan area sekitar.",
      waktuKejadian: hoursAgo(2),
      detailLokasi:
        "Dekat pintu keluar parkiran Asrama Putri Tower A",
      isAnonim: false,
      tingkatUrgensi: "DARURAT",
      status: "DITERIMA",
      pelaporId: "usr-01",
      kategoriId: "kat-01",
      lokasiId: "lok-kampus-bandung",
    },
    {
      idLaporan: "lap-002",
      nomorKasus: `REG-${casePeriod}-002`,
      jenis: "REGULER",
      kronologi:
        "Pelapor menerima pesan bernuansa seksual yang tidak dikehendaki melalui grup percakapan tugas kuliah.",
      keteranganTambahan:
        "Tangkapan layar percakapan disertakan sebagai bukti awal.",
      waktuKejadian: hoursAgo(8),
      detailLokasi: "Ruang D304 Gedung Damar",
      isAnonim: true,
      tingkatUrgensi: "TINGGI",
      status: "DITERIMA",
      pelaporId: "usr-02",
      kategoriId: "kat-02",
      lokasiId: "lok-kampus-bandung",
    },
    {
      idLaporan: "lap-003",
      nomorKasus: `REG-${casePeriod}-003`,
      jenis: "REGULER",
      kronologi:
        "Pelapor mengalami catcalling berulang kali ketika berjalan menuju halte di area kampus.",
      keteranganTambahan:
        "Terdapat saksi yang bersedia memberikan keterangan.",
      waktuKejadian: daysAgo(2),
      detailLokasi: "Selasar Kantin Terbuka",
      isAnonim: false,
      tingkatUrgensi: "SEDANG",
      status: "DIVERIFIKASI",
      pelaporId: "usr-02",
      kategoriId: "kat-03",
      lokasiId: "lok-kampus-bandung",
    },
    {
      idLaporan: "lap-004",
      nomorKasus: `REG-${casePeriod}-004`,
      jenis: "REGULER",
      kronologi:
        "Dilaporkan dugaan intimidasi akademik dan penyalahgunaan relasi kuasa yang disertai pemaksaan kontak fisik.",
      keteranganTambahan:
        "Satgas sedang melakukan pendalaman keterangan.",
      waktuKejadian: daysAgo(5),
      detailLokasi: "Lantai 2 Gedung Deli",
      isAnonim: false,
      tingkatUrgensi: "TINGGI",
      status: "DITANGANI",
      pelaporId: "usr-03",
      kategoriId: "kat-04",
      lokasiId: "lok-kampus-bandung",
    },
    {
      idLaporan: "lap-005",
      nomorKasus: `REG-${casePeriod}-005`,
      jenis: "REGULER",
      kronologi:
        "Korban melaporkan dugaan penguntitan dari perpustakaan menuju area asrama oleh seseorang yang tidak dikenal.",
      keteranganTambahan:
        "Satgas sedang memeriksa keterangan dan rekaman CCTV yang relevan.",
      waktuKejadian: daysAgo(8),
      detailLokasi: "Open Library Lantai 2",
      isAnonim: true,
      tingkatUrgensi: "SEDANG",
      status: "DITANGANI",
      pelaporId: "usr-01",
      kategoriId: "kat-05",
      lokasiId: "lok-kampus-bandung",
    },
    {
      idLaporan: "lap-006",
      nomorKasus: `REG-${casePeriod}-006`,
      jenis: "REGULER",
      kronologi:
        "Pelapor menyampaikan dugaan pelecehan verbal di area publik depan pos keamanan kampus.",
      keteranganTambahan:
        "Pemeriksaan telah selesai dan tindak lanjut administratif telah dicatat.",
      waktuKejadian: daysAgo(20),
      detailLokasi: "Lobby Gedung Cacuk Gunawan",
      isAnonim: false,
      tingkatUrgensi: "RENDAH",
      status: "SELESAI",
      pelaporId: "usr-04",
      kategoriId: "kat-03",
      lokasiId: "lok-kampus-bandung",
    },
  ];

  logSeed(
    "Laporan",
    await seedRecords(
      prisma.laporan,
      "idLaporan",
      dummyKasus
    )
  );

  // ====================================================
  // 7. PIHAK TERLIBAT
  // ====================================================

  // Identitas pihak terkait merupakan data fiktif.
  // Status sebagai PELAKU pada tabel ini hanya peran
  // administratif dalam laporan, bukan putusan bersalah.

  const pihakList = [
    {
      idPihak: "pihak-001",
      nama: "Anisa Rahmawati",
      peran: "KORBAN",
      keterangan: "Korban yang tercantum pada laporan darurat.",
      laporanId: "lap-001",
    },
    {
      idPihak: "pihak-002",
      nama: "Belum Teridentifikasi",
      peran: "PELAKU",
      keterangan:
        "Pihak terlapor belum diketahui identitasnya.",
      laporanId: "lap-001",
    },
    {
      idPihak: "pihak-003",
      nama: "Identitas Dirahasiakan",
      peran: "KORBAN",
      keterangan:
        "Identitas korban tidak ditampilkan pada antarmuka publik.",
      laporanId: "lap-002",
    },
    {
      idPihak: "pihak-004",
      nama: "Mahasiswa Terlapor A",
      peran: "PELAKU",
      keterangan:
        "Identitas samaran untuk pihak yang dilaporkan.",
      laporanId: "lap-002",
    },
    {
      idPihak: "pihak-005",
      nama: "Mahasiswa Saksi A",
      peran: "SAKSI",
      keterangan:
        "Saksi yang menyatakan bersedia memberikan keterangan.",
      laporanId: "lap-003",
    },
    {
      idPihak: "pihak-006",
      nama: "Dosen Terlapor A",
      peran: "PELAKU",
      keterangan:
        "Pihak terlapor dalam dugaan penyalahgunaan relasi kuasa.",
      laporanId: "lap-004",
    },
    {
      idPihak: "pihak-007",
      nama: "Petugas Keamanan A",
      peran: "SAKSI",
      keterangan:
        "Pihak yang membantu pemeriksaan awal area kejadian.",
      laporanId: "lap-005",
    },
    {
      idPihak: "pihak-008",
      nama: "Petugas Pendamping A",
      peran: "LAINNYA",
      keterangan:
        "Petugas pendamping dalam proses penyelesaian laporan.",
      laporanId: "lap-006",
    },
  ];

  logSeed(
    "PihakTerlibat",
    await seedRecords(
      prisma.pihakTerlibat,
      "idPihak",
      pihakList
    )
  );

  // ====================================================
  // 8. BUKTI LAPORAN
  // ====================================================

  // Path bukti bersifat dummy dan belum memiliki file fisik.

  const buktiLaporanList = [
    {
      idBukti: "bukti-001",
      namaFile: "foto_lokasi_kejadian.jpg",
      tipeFile: "image/jpeg",
      fileUrl: "/uploads/dummy/laporan/lap-001/foto_lokasi.jpg",
      uploadAt: hoursAgo(1),
      laporanId: "lap-001",
      pelaporId: "usr-01",
    },
    {
      idBukti: "bukti-002",
      namaFile: "screenshot_percakapan.png",
      tipeFile: "image/png",
      fileUrl: "/uploads/dummy/laporan/lap-002/chat.png",
      uploadAt: hoursAgo(7),
      laporanId: "lap-002",
      pelaporId: "usr-02",
    },
    {
      idBukti: "bukti-003",
      namaFile: "rekaman_suara.mp3",
      tipeFile: "audio/mpeg",
      fileUrl: "/uploads/dummy/laporan/lap-003/audio.mp3",
      uploadAt: daysAgo(1),
      laporanId: "lap-003",
      pelaporId: "usr-02",
    },
    {
      idBukti: "bukti-004",
      namaFile: "dokumen_keterangan.pdf",
      tipeFile: "application/pdf",
      fileUrl: "/uploads/dummy/laporan/lap-004/dokumen.pdf",
      uploadAt: daysAgo(4),
      laporanId: "lap-004",
      pelaporId: "usr-03",
    },
    {
      idBukti: "bukti-005",
      namaFile: "foto_area_perpustakaan.jpg",
      tipeFile: "image/jpeg",
      fileUrl: "/uploads/dummy/laporan/lap-005/foto.jpg",
      uploadAt: daysAgo(7),
      laporanId: "lap-005",
      pelaporId: "usr-01",
    },
    {
      idBukti: "bukti-006",
      namaFile: "surat_keterangan_saksi.pdf",
      tipeFile: "application/pdf",
      fileUrl: "/uploads/dummy/laporan/lap-006/saksi.pdf",
      uploadAt: daysAgo(19),
      laporanId: "lap-006",
      pelaporId: "usr-04",
    },
  ];

  logSeed(
    "BuktiLaporan",
    await seedRecords(
      prisma.buktiLaporan,
      "idBukti",
      buktiLaporanList
    )
  );

  // ====================================================
  // 9. PERMINTAAN INFORMASI
  // ====================================================

  const permintaanList = [
    {
      idPermintaan: "perm-001",
      isiPermintaan:
        "Mohon melengkapi informasi mengenai ciri-ciri pihak terlapor dan waktu kejadian.",
      tanggal: hoursAgo(1),
      status: "TERKIRIM",
      laporanId: "lap-001",
      satgasId: "satgas-001",
      pelaporId: "usr-01",
    },
    {
      idPermintaan: "perm-002",
      isiPermintaan:
        "Mohon memberikan bukti percakapan tambahan yang relevan dengan laporan.",
      tanggal: hoursAgo(5),
      status: "DIBACA",
      laporanId: "lap-002",
      satgasId: "satgas-001",
      pelaporId: "usr-02",
    },
    {
      idPermintaan: "perm-003",
      isiPermintaan:
        "Mohon mengonfirmasi identitas saksi yang bersedia dimintai keterangan.",
      tanggal: daysAgo(1),
      status: "DITANGGAPI",
      laporanId: "lap-003",
      satgasId: "satgas-002",
      pelaporId: "usr-02",
    },
    {
      idPermintaan: "perm-004",
      isiPermintaan:
        "Mohon konfirmasi bahwa informasi dan dokumen yang diperlukan telah diterima.",
      tanggal: daysAgo(18),
      status: "SELESAI",
      laporanId: "lap-006",
      satgasId: "satgas-001",
      pelaporId: "usr-04",
    },
  ];

  logSeed(
    "PermintaanInformasi",
    await seedRecords(
      prisma.permintaanInformasi,
      "idPermintaan",
      permintaanList
    )
  );

  // ====================================================
  // 10. RIWAYAT PENANGANAN
  // ====================================================

  const riwayatList = [
    {
      idRiwayat: "riw-001",
      jenisAktivitas: "Laporan Masuk",
      statusLama: null,
      statusBaru: "DITERIMA",
      catatan: "Laporan darurat diterima sistem.",
      createdAt: hoursAgo(2),
      laporanId: "lap-001",
      satgasId: "satgas-001",
    },
    {
      idRiwayat: "riw-002",
      jenisAktivitas: "Laporan Masuk",
      statusLama: null,
      statusBaru: "DITERIMA",
      catatan: "Laporan reguler diterima sistem.",
      createdAt: hoursAgo(8),
      laporanId: "lap-002",
      satgasId: "satgas-001",
    },
    {
      idRiwayat: "riw-003",
      jenisAktivitas: "Verifikasi Laporan",
      statusLama: "DITERIMA",
      statusBaru: "DIVERIFIKASI",
      catatan: "Data awal laporan telah diperiksa.",
      createdAt: daysAgo(1),
      laporanId: "lap-003",
      satgasId: "satgas-002",
    },
    {
      idRiwayat: "riw-004",
      jenisAktivitas: "Verifikasi Laporan",
      statusLama: "DITERIMA",
      statusBaru: "DIVERIFIKASI",
      catatan: "Laporan dinyatakan layak ditindaklanjuti.",
      createdAt: daysAgo(4),
      laporanId: "lap-004",
      satgasId: "satgas-001",
    },
    {
      idRiwayat: "riw-005",
      jenisAktivitas: "Mulai Penanganan",
      statusLama: "DIVERIFIKASI",
      statusBaru: "DITANGANI",
      catatan: "Satgas melakukan pendalaman keterangan.",
      createdAt: daysAgo(3),
      laporanId: "lap-004",
      satgasId: "satgas-001",
    },
    {
      idRiwayat: "riw-006",
      jenisAktivitas: "Verifikasi Laporan",
      statusLama: "DITERIMA",
      statusBaru: "DIVERIFIKASI",
      catatan: "Identitas pelapor dijaga kerahasiaannya.",
      createdAt: daysAgo(7),
      laporanId: "lap-005",
      satgasId: "satgas-002",
    },
    {
      idRiwayat: "riw-007",
      jenisAktivitas: "Mulai Penanganan",
      statusLama: "DIVERIFIKASI",
      statusBaru: "DITANGANI",
      catatan: "Satgas memulai pemeriksaan CCTV.",
      createdAt: daysAgo(6),
      laporanId: "lap-005",
      satgasId: "satgas-002",
    },
    {
      idRiwayat: "riw-008",
      jenisAktivitas: "Verifikasi Laporan",
      statusLama: "DITERIMA",
      statusBaru: "DIVERIFIKASI",
      catatan: "Laporan dan informasi pendukung diperiksa.",
      createdAt: daysAgo(19),
      laporanId: "lap-006",
      satgasId: "satgas-001",
    },
    {
      idRiwayat: "riw-009",
      jenisAktivitas: "Mulai Penanganan",
      statusLama: "DIVERIFIKASI",
      statusBaru: "DITANGANI",
      catatan: "Satgas melakukan pemeriksaan lanjutan.",
      createdAt: daysAgo(17),
      laporanId: "lap-006",
      satgasId: "satgas-001",
    },
    {
      idRiwayat: "riw-010",
      jenisAktivitas: "Penyelesaian Laporan",
      statusLama: "DITANGANI",
      statusBaru: "SELESAI",
      catatan: "Penanganan dan tindak lanjut telah dicatat.",
      createdAt: daysAgo(15),
      laporanId: "lap-006",
      satgasId: "satgas-001",
    },
  ];

  logSeed(
    "RiwayatPenanganan",
    await seedRecords(
      prisma.riwayatPenanganan,
      "idRiwayat",
      riwayatList
    )
  );

  // ====================================================
  // 11. HASIL PEMERIKSAAN
  // ====================================================

  const hasilList = [
    {
      idHasil: "hasil-001",
      tanggalPemeriksaan: daysAgo(2),
      hasil:
        "Pemeriksaan awal mencatat keterangan pelapor dan dokumen pendukung. Pendalaman masih diperlukan.",
      keputusan: "LAINNYA",
      kesimpulan:
        "Belum terdapat keputusan akhir karena proses pemeriksaan masih berlangsung.",
      tindakLanjut:
        "Menjadwalkan pemeriksaan tambahan terhadap pihak terkait.",
      tanggalTindakan: null,
      laporanId: "lap-004",
      satgasId: "satgas-001",
    },
    {
      idHasil: "hasil-002",
      tanggalPemeriksaan: daysAgo(5),
      hasil:
        "Pemeriksaan awal terhadap keterangan saksi dan rekaman CCTV telah dilakukan.",
      keputusan: "LAINNYA",
      kesimpulan:
        "Informasi yang tersedia belum cukup untuk menetapkan hasil pemeriksaan akhir.",
      tindakLanjut:
        "Melanjutkan penelusuran rekaman dan klarifikasi saksi.",
      tanggalTindakan: null,
      laporanId: "lap-005",
      satgasId: "satgas-002",
    },
    {
      idHasil: "hasil-003",
      tanggalPemeriksaan: daysAgo(16),
      hasil:
        "Pemeriksaan keterangan pelapor dan saksi menghasilkan temuan yang mendukung terjadinya pelecehan verbal.",
      keputusan: "TERBUKTI",
      kesimpulan:
        "Kasus dinyatakan terbukti dalam skenario data pengujian.",
      tindakLanjut:
        "Penyelesaian administratif serta pemberian edukasi kepada pihak terkait.",
      tanggalTindakan: daysAgo(15),
      laporanId: "lap-006",
      satgasId: "satgas-001",
    },
  ];

  logSeed(
    "HasilPemeriksaan",
    await seedRecords(
      prisma.hasilPemeriksaan,
      "idHasil",
      hasilList
    )
  );

  // ====================================================
  // 12. DETEKSI AI
  // ====================================================

  // Semua hasil deteksi berikut merupakan SIMULASI.
  // Confidence dan threshold tidak berasal dari model AI.
  // Jenis isyarat merupakan label contoh, bukan putusan
  // mengenai terjadinya kekerasan seksual.

  const deteksiList = [
    {
      idAI: "ai-001",
      waktuDeteksi: hoursAgo(2),
      jenisIsyarat: "SOS_HAND_GESTURE",
      confidenceScore: "0.9520",
      memenuhiThreshold: true,
      snapshotUrl: "/uploads/dummy/ai/ai-001.jpg",
      cctvId: "cctv-001",
    },
    {
      idAI: "ai-002",
      waktuDeteksi: daysAgo(2),
      jenisIsyarat: "SOS_HAND_GESTURE",
      confidenceScore: "0.9100",
      memenuhiThreshold: true,
      snapshotUrl: "/uploads/dummy/ai/ai-002.jpg",
      cctvId: "cctv-002",
    },
    {
      idAI: "ai-003",
      waktuDeteksi: daysAgo(5),
      jenisIsyarat: "SOS_HAND_GESTURE",
      confidenceScore: "0.8700",
      memenuhiThreshold: true,
      snapshotUrl: "/uploads/dummy/ai/ai-003.jpg",
      cctvId: "cctv-003",
    },
    {
      idAI: "ai-004",
      waktuDeteksi: daysAgo(8),
      jenisIsyarat: "SOS_HAND_GESTURE",
      confidenceScore: "0.4500",
      memenuhiThreshold: false,
      snapshotUrl: "/uploads/dummy/ai/ai-004.jpg",
      cctvId: "cctv-003",
    },
    {
      idAI: "ai-005",
      waktuDeteksi: daysAgo(10),
      jenisIsyarat: "SOS_HAND_GESTURE",
      confidenceScore: "0.9300",
      memenuhiThreshold: true,
      snapshotUrl: "/uploads/dummy/ai/ai-005.jpg",
      cctvId: "cctv-001",
    },
    {
      idAI: "ai-006",
      waktuDeteksi: daysAgo(12),
      jenisIsyarat: "SOS_HAND_GESTURE",
      confidenceScore: "0.3800",
      memenuhiThreshold: false,
      snapshotUrl: null,
      cctvId: "cctv-002",
    },
  ];

  logSeed(
    "DeteksiAI",
    await seedRecords(
      prisma.deteksiAI,
      "idAI",
      deteksiList
    )
  );

  // ====================================================
  // 13. INCIDENT ALERT
  // ====================================================

  // Hubungan dengan laporan bukan berarti AI otomatis
  // membuktikan kasus. Verifikasi tetap dilakukan manusia.

  const incidentList = [
    {
      idIncident: "inc-001",
      statusVerifikasi: "PENDING",
      statusPengiriman: "TERKIRIM",
      catatanVerifikasi:
        "Alert dikirim kepada Satgas dan menunggu pemeriksaan.",
      createdAt: hoursAgo(2),
      deteksiAIId: "ai-001",
      laporanId: "lap-001",
    },
    {
      idIncident: "inc-002",
      statusVerifikasi: "TERVERIFIKASI",
      statusPengiriman: "TERKIRIM",
      catatanVerifikasi:
        "Petugas mengonfirmasi bahwa alert memerlukan tindak lanjut. Tidak menjadi bukti otomatis terjadinya kekerasan.",
      createdAt: daysAgo(2),
      deteksiAIId: "ai-002",
      laporanId: "lap-003",
    },
    {
      idIncident: "inc-003",
      statusVerifikasi: "TERVERIFIKASI",
      statusPengiriman: "TERKIRIM",
      catatanVerifikasi:
        "Alert telah diperiksa dan dikaitkan dengan proses penanganan laporan yang relevan.",
      createdAt: daysAgo(5),
      deteksiAIId: "ai-003",
      laporanId: "lap-005",
    },
    {
      idIncident: "inc-004",
      statusVerifikasi: "DITOLAK",
      statusPengiriman: "TERKIRIM",
      catatanVerifikasi:
        "Alert ditolak setelah pemeriksaan manual karena dianggap false positive.",
      createdAt: daysAgo(10),
      deteksiAIId: "ai-005",
      laporanId: null,
    },
  ];

  logSeed(
    "IncidentAlert",
    await seedRecords(
      prisma.incidentAlert,
      "idIncident",
      incidentList
    )
  );

  // ====================================================
  // 14. BUKTI CCTV
  // ====================================================

  const buktiCCTVList = [
    {
      idBuktiCCTV: "bcctv-001",
      tanggalRekaman: hoursAgo(2),
      timestampMulai: hoursAgo(2),
      timestampAkhir: minutesAfter(hoursAgo(2), 5),
      fileUrl: "/uploads/dummy/cctv/lap-001/rekaman.mp4",
      catatan:
        "Placeholder cuplikan rekaman sekitar waktu laporan darurat.",
      laporanId: "lap-001",
      cctvId: "cctv-001",
    },
    {
      idBuktiCCTV: "bcctv-002",
      tanggalRekaman: daysAgo(2),
      timestampMulai: daysAgo(2),
      timestampAkhir: minutesAfter(daysAgo(2), 10),
      fileUrl: "/uploads/dummy/cctv/lap-003/rekaman.mp4",
      catatan:
        "Placeholder rekaman area selasar untuk pemeriksaan.",
      laporanId: "lap-003",
      cctvId: "cctv-002",
    },
    {
      idBuktiCCTV: "bcctv-003",
      tanggalRekaman: daysAgo(5),
      timestampMulai: daysAgo(5),
      timestampAkhir: minutesAfter(daysAgo(5), 8),
      fileUrl: "/uploads/dummy/cctv/lap-004/rekaman.mp4",
      catatan:
        "Placeholder rekaman pendukung pemeriksaan awal.",
      laporanId: "lap-004",
      cctvId: "cctv-002",
    },
    {
      idBuktiCCTV: "bcctv-004",
      tanggalRekaman: daysAgo(8),
      timestampMulai: daysAgo(8),
      timestampAkhir: minutesAfter(daysAgo(8), 12),
      fileUrl: "/uploads/dummy/cctv/lap-005/rekaman.mp4",
      catatan:
        "Placeholder rekaman area Open Library yang sedang ditinjau.",
      laporanId: "lap-005",
      cctvId: "cctv-003",
    },
    {
      idBuktiCCTV: "bcctv-005",
      tanggalRekaman: daysAgo(20),
      timestampMulai: daysAgo(20),
      timestampAkhir: minutesAfter(daysAgo(20), 5),
      fileUrl: "/uploads/dummy/cctv/lap-006/rekaman.mp4",
      catatan:
        "Placeholder rekaman yang dicatat pada kasus selesai.",
      laporanId: "lap-006",
      cctvId: "cctv-001",
    },
  ];

  logSeed(
    "BuktiCCTV",
    await seedRecords(
      prisma.buktiCCTV,
      "idBuktiCCTV",
      buktiCCTVList
    )
  );

  // ====================================================
  // 15. NOTIFIKASI
  // ====================================================

  const notifikasiList = [
    {
      idNotif: "notif-001",
      judul: "Laporan Darurat Diterima",
      pesan:
        "Laporan darurat Anda berhasil diterima dan sedang menunggu respons Satgas.",
      tipe: "LAPORAN",
      isRead: false,
      createdAt: hoursAgo(2),
      laporanId: "lap-001",
      pelaporId: "usr-01",
      satgasId: null,
      incidentAlertId: null,
    },
    {
      idNotif: "notif-002",
      judul: "Laporan Baru Masuk",
      pesan:
        "Terdapat laporan darurat baru yang membutuhkan perhatian Satgas.",
      tipe: "LAPORAN_DARURAT",
      isRead: false,
      createdAt: hoursAgo(2),
      laporanId: "lap-001",
      pelaporId: null,
      satgasId: "satgas-001",
      incidentAlertId: null,
    },
    {
      idNotif: "notif-003",
      judul: "Permintaan Informasi Tambahan",
      pesan:
        "Satgas meminta informasi tambahan untuk melengkapi laporan Anda.",
      tipe: "PERMINTAAN_INFORMASI",
      isRead: false,
      createdAt: hoursAgo(5),
      laporanId: "lap-002",
      pelaporId: "usr-02",
      satgasId: null,
      incidentAlertId: null,
    },
    {
      idNotif: "notif-004",
      judul: "Status Laporan Diperbarui",
      pesan:
        "Laporan Anda telah diverifikasi dan tercatat dalam sistem.",
      tipe: "STATUS_LAPORAN",
      isRead: true,
      createdAt: daysAgo(1),
      laporanId: "lap-003",
      pelaporId: "usr-02",
      satgasId: null,
      incidentAlertId: null,
    },
    {
      idNotif: "notif-005",
      judul: "Laporan Sedang Ditangani",
      pesan:
        "Satgas sedang melakukan pemeriksaan lebih lanjut terhadap laporan Anda.",
      tipe: "STATUS_LAPORAN",
      isRead: true,
      createdAt: daysAgo(3),
      laporanId: "lap-004",
      pelaporId: "usr-03",
      satgasId: null,
      incidentAlertId: null,
    },
    {
      idNotif: "notif-006",
      judul: "Laporan Selesai",
      pesan:
        "Proses penanganan laporan telah selesai. Silakan melihat riwayat penanganan.",
      tipe: "STATUS_LAPORAN",
      isRead: true,
      createdAt: daysAgo(15),
      laporanId: "lap-006",
      pelaporId: "usr-04",
      satgasId: null,
      incidentAlertId: null,
    },
    {
      idNotif: "notif-007",
      judul: "Peringatan Deteksi AI",
      pesan:
        "Sistem mendeteksi indikasi isyarat SOS pada CAM-BDG-001. Diperlukan verifikasi petugas.",
      tipe: "AI_ALERT",
      isRead: false,
      createdAt: hoursAgo(2),
      laporanId: "lap-001",
      pelaporId: null,
      satgasId: "satgas-001",
      incidentAlertId: "inc-001",
    },
    {
      idNotif: "notif-008",
      judul: "Alert AI Memerlukan Tindak Lanjut",
      pesan:
        "Alert dari CAM-BDG-002 telah diverifikasi untuk tindak lanjut.",
      tipe: "AI_ALERT",
      isRead: true,
      createdAt: daysAgo(2),
      laporanId: "lap-003",
      pelaporId: null,
      satgasId: "satgas-002",
      incidentAlertId: "inc-002",
    },
  ];

  logSeed(
    "Notifikasi",
    await seedRecords(
      prisma.notifikasi,
      "idNotif",
      notifikasiList
    )
  );

  // ====================================================
  // 16. KONTEN EDUKASI
  // ====================================================

  const edukasiList = [
    {
      idEdukasi: "edu-001",
      judul: "Mengenal Kekerasan Seksual di Lingkungan Kampus",
      kategori: "Pencegahan",
      isi:
        "Kekerasan seksual merupakan tindakan bernuansa seksual yang dilakukan tanpa persetujuan. Mahasiswa, dosen, dan tenaga kependidikan perlu memahami bentuk, dampak, serta mekanisme pelaporannya.",
      status: "PUBLISHED",
      mediaUrl: "/uploads/dummy/edukasi/pencegahan.jpg",
      satgasId: "satgas-001",
    },
    {
      idEdukasi: "edu-002",
      judul: "Cara Melaporkan Kekerasan Seksual",
      kategori: "Panduan Pelaporan",
      isi:
        "Pengguna dapat masuk ke aplikasi SAFE SPACE, memilih jenis laporan, mengisi kronologi, waktu dan lokasi kejadian, serta mengunggah bukti jika tersedia. Laporan selanjutnya ditinjau oleh Satgas PPKS.",
      status: "PUBLISHED",
      mediaUrl: "/uploads/dummy/edukasi/pelaporan.jpg",
      satgasId: "satgas-001",
    },
    {
      idEdukasi: "edu-003",
      judul: "Memahami Persetujuan atau Consent",
      kategori: "Edukasi",
      isi:
        "Persetujuan harus diberikan secara sadar, sukarela, spesifik, dan dapat ditarik kembali. Diam, ketakutan, atau keterpaksaan bukan bentuk persetujuan.",
      status: "PUBLISHED",
      mediaUrl: "/uploads/dummy/edukasi/consent.png",
      satgasId: "satgas-002",
    },
    {
      idEdukasi: "edu-004",
      judul: "Langkah Aman Menghadapi Situasi Darurat",
      kategori: "Keselamatan",
      isi:
        "Utamakan keselamatan diri. Jika memungkinkan, berpindahlah ke tempat aman, hubungi petugas keamanan atau layanan darurat, dan gunakan fitur Emergency Report untuk meminta bantuan.",
      status: "PUBLISHED",
      mediaUrl: "/uploads/dummy/edukasi/emergency.jpg",
      satgasId: "satgas-001",
    },
    {
      idEdukasi: "edu-005",
      judul: "Peran AI dan CCTV dalam Sistem SAFE SPACE",
      kategori: "Teknologi",
      isi:
        "Sistem AI membantu mendeteksi indikasi isyarat SOS melalui CCTV dan menghasilkan alert untuk ditinjau petugas. Hasil deteksi tidak secara otomatis membuktikan terjadinya kekerasan seksual. Verifikasi manusia tetap diperlukan.",
      status: "DRAFT",
      mediaUrl: null,
      satgasId: "satgas-002",
    },
  ];

  logSeed(
    "KontenEdukasi",
    await seedRecords(
      prisma.kontenEdukasi,
      "idEdukasi",
      edukasiList
    )
  );

  // ====================================================
  // SUMMARY
  // ====================================================

  const totalRecords = Object.values(totals).reduce(
    (sum, count) => sum + count,
    0
  );

  console.log("\n========================================");
  console.log("✨ SEEDING SAFE SPACE BERHASIL!");
  console.log("========================================");
  console.log(`Total tabel      : ${Object.keys(totals).length}`);
  console.log(`Total data dummy : ${totalRecords}`);
  console.log(`Periode kasus    : ${casePeriod}`);
  console.log("========================================");

  console.log("\n🔐 AKUN TESTING");
  console.log("----------------------------------------");
  console.log("Satgas : satgas@telkomuniversity.ac.id");
  console.log("Admin  : admin.ppks@telkomuniversity.ac.id");
  console.log("Pelapor: anisa@student.telkomuniversity.ac.id");
  console.log("Password seluruh akun: password123");
  console.log("----------------------------------------");

  console.log("\n⚠️ DATA HANYA UNTUK DEVELOPMENT/TESTING");
}

// ======================================================
// EXECUTION
// ======================================================

main()
  .catch((error) => {
    console.error("\n❌ SEEDING GAGAL");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
