import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

async function main() {
  console.log("🌱 Menyiapkan data dummy untuk SAFE SPACE...");

  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  // 1. Akun Satgas
  const satgas = await prisma.satgasPPKS.upsert({
    where: { email: "satgas@telkomuniversity.ac.id" },
    update: {},
    create: {
      idSatgasPPKS: "satgas-001",
      nama: "Satgas PPKS Tel-U",
      email: "satgas@telkomuniversity.ac.id",
      passwordHash: defaultPasswordHash,
      noHp: "081234567890",
    },
  });
  console.log("✅ Satgas dibuat:", satgas.email);

  // 2. Kategori Kasus
  const kategoriList = [
    { idKategori: "kat-01", nama: "Kekerasan Seksual Fisik", deskripsi: "Sentuhan fisik tanpa persetujuan, paksaan, atau penyerangan seksual." },
    { idKategori: "kat-02", nama: "Kekerasan Berbasis Elektronik (KSBE)", deskripsi: "Pelecehan via pesan teks, medsos, panggilan, atau media online." },
    { idKategori: "kat-03", nama: "Pelecehan Verbal / Catcalling", deskripsi: "Komentar seksual, lelucon cabul, siulan, atau ucapan tidak pantas." },
    { idKategori: "kat-04", nama: "Intimidasi & Penyalahgunaan Relasi Kuasa", deskripsi: "Ancaman nilai, karir, atau sanksi dengan motif seksual atau pemaksaan." },
    { idKategori: "kat-05", nama: "Penguntitan (Stalking)", deskripsi: "Mengikuti, mengawasi terus-menerus, dan mengintimidasi korban." },
  ];

  for (const kat of kategoriList) {
    await prisma.kategoriKasus.upsert({
      where: { idKategori: kat.idKategori },
      update: {},
      create: kat,
    });
  }

  // 3. Lokasi
  const lokasiList = [
    { idLokasi: "lok-01", namaGedung: "Asrama Putri Tower A", area: "Lantai 1 Area Parkir Belakang" },
    { idLokasi: "lok-02", namaGedung: "Gedung Kuliah Bersama (Damar)", area: "Ruang Kuliah D304" },
    { idLokasi: "lok-03", namaGedung: "Kantin Terbuka (Kantin Barat)", area: "Area Selasar Gazebo Utama" },
    { idLokasi: "lok-04", namaGedung: "Gedung Deli", area: "Lantai 2 Ruang Staf Akademik" },
    { idLokasi: "lok-05", namaGedung: "Telkom University Open Library", area: "Lantai 2 Sudut Baca Tenang" },
    { idLokasi: "lok-06", namaGedung: "Gedung Cacuk Gunawan", area: "Lobby Depan Pos Satpam" },
  ];

  for (const lok of lokasiList) {
    await prisma.lokasi.upsert({
      where: { idLokasi: lok.idLokasi },
      update: {},
      create: lok,
    });
  }

  // 4. Pelapor
  const pelaporList = [
    { idPelapor: "usr-01", nama: "Anisa Rahmawati", email: "anisa@student.telkomuniversity.ac.id", jenisPengguna: "MAHASISWA", nimNip: "1301210001", noHp: "081211112222" },
    { idPelapor: "usr-02", nama: "Dimas Prasetyo", email: "dimas@student.telkomuniversity.ac.id", jenisPengguna: "MAHASISWA", nimNip: "1301210002", noHp: "081233334444" },
    { idPelapor: "usr-03", nama: "Siti Nurhaliza", email: "siti@telkomuniversity.ac.id", jenisPengguna: "STAFF", nimNip: "19880101001", noHp: "081255556666" },
    { idPelapor: "usr-04", nama: "Dr. Ir. Hendra Saputra, M.T.", email: "hendra@telkomuniversity.ac.id", jenisPengguna: "DOSEN", nimNip: "19750505002", noHp: "081277778888" },
  ];

  for (const pel of pelaporList) {
    await prisma.pelapor.upsert({
      where: { email: pel.email },
      update: {},
      create: {
        ...pel,
        passwordHash: defaultPasswordHash,
      },
    });
  }

  // 5. Laporan
  const dummyKasus = [
    {
      idLaporan: "lap-001",
      nomorKasus: "EMG-202410-001",
      jenis: "EMERGENCY",
      kronologi: "Terjadi sentuhan fisik tanpa izin di area parkir belakang saat suasana sepi malam hari.",
      waktuKejadian: new Date(Date.now() - 1000 * 60 * 45),
      detailLokasi: "Dekat pintu keluar parkiran asrama putri tower A",
      tingkatUrgensi: "DARURAT",
      status: "DITERIMA",
      isAnonim: false,
      pelaporId: "usr-01",
      kategoriId: "kat-01",
      lokasiId: "lok-01",
    },
    {
      idLaporan: "lap-002",
      nomorKasus: "REG-202410-002",
      jenis: "REGULER",
      kronologi: "Penyebaran pesan bernuansa seksual di grup percakapan tugas kuliah oleh oknum mahasiswa.",
      waktuKejadian: new Date(Date.now() - 1000 * 60 * 60 * 3),
      detailLokasi: "Ruang D304 Gedung Damar",
      tingkatUrgensi: "TINGGI",
      status: "DITERIMA",
      isAnonim: true,
      pelaporId: "usr-02",
      kategoriId: "kat-02",
      lokasiId: "lok-02",
    },
    {
      idLaporan: "lap-003",
      nomorKasus: "REG-202410-003",
      jenis: "REGULER",
      kronologi: "Catcalling berulang kali oleh sekelompok mahasiswa saat berjalan menuju halte.",
      waktuKejadian: new Date(Date.now() - 1000 * 60 * 60 * 12),
      detailLokasi: "Selasar Kantin Terbuka",
      tingkatUrgensi: "SEDANG",
      status: "DIVERIFIKASI",
      isAnonim: false,
      pelaporId: "usr-02",
      kategoriId: "kat-03",
      lokasiId: "lok-03",
    },
    {
      idLaporan: "lap-004",
      nomorKasus: "REG-202410-004",
      jenis: "REGULER",
      kronologi: "Tindakan intimidasi dan ancaman penilaian akademik yang melibatkan pemaksaan kontak fisik.",
      waktuKejadian: new Date(Date.now() - 1000 * 60 * 60 * 24),
      detailLokasi: "Lantai 2 Gedung Deli",
      tingkatUrgensi: "TINGGI",
      status: "DITANGANI",
      isAnonim: false,
      pelaporId: "usr-03",
      kategoriId: "kat-04",
      lokasiId: "lok-04",
    },
    {
      idLaporan: "lap-005",
      nomorKasus: "REG-202410-005",
      jenis: "REGULER",
      kronologi: "Korban dibuntuti terus menerus dari perpustakaan hingga asrama oleh orang tidak dikenal.",
      waktuKejadian: new Date(Date.now() - 1000 * 60 * 60 * 36),
      detailLokasi: "Sudut baca Open Library Lt 2",
      tingkatUrgensi: "SEDANG",
      status: "DITANGANI",
      isAnonim: true,
      pelaporId: "usr-01",
      kategoriId: "kat-05",
      lokasiId: "lok-05",
    },
    {
      idLaporan: "lap-006",
      nomorKasus: "REG-202410-006",
      jenis: "REGULER",
      kronologi: "Tindakan verbal tidak senonoh di area publik depan pos satpam.",
      waktuKejadian: new Date(Date.now() - 1000 * 60 * 60 * 48),
      detailLokasi: "Lobby Gedung Cacuk Gunawan",
      tingkatUrgensi: "RENDAH",
      status: "SELESAI",
      isAnonim: false,
      pelaporId: "usr-04",
      kategoriId: "kat-03",
      lokasiId: "lok-06",
    },
  ];

  for (const kasus of dummyKasus) {
    await prisma.laporan.upsert({
      where: { nomorKasus: kasus.nomorKasus },
      update: {},
      create: kasus,
    });
  }

  console.log("✨ Seeding data dummy selesai! Berhasil mengisi data manajemen laporan.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

