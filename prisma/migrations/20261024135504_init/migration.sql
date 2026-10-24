-- CreateTable
CREATE TABLE `Pelapor` (
    `idPelapor` VARCHAR(30) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `jenisPengguna` ENUM('MAHASISWA', 'STAFF', 'DOSEN') NOT NULL,
    `nimNip` VARCHAR(50) NOT NULL,
    `noHp` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Pelapor_email_key`(`email`),
    PRIMARY KEY (`idPelapor`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SatgasPPKS` (
    `idSatgasPPKS` VARCHAR(30) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `noHp` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SatgasPPKS_email_key`(`email`),
    PRIMARY KEY (`idSatgasPPKS`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KategoriKasus` (
    `idKategori` VARCHAR(30) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `deskripsi` TEXT NOT NULL,

    PRIMARY KEY (`idKategori`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lokasi` (
    `idLokasi` VARCHAR(30) NOT NULL,
    `namaGedung` VARCHAR(150) NOT NULL,
    `area` VARCHAR(150) NOT NULL,

    PRIMARY KEY (`idLokasi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Laporan` (
    `idLaporan` VARCHAR(30) NOT NULL,
    `nomorKasus` VARCHAR(50) NOT NULL,
    `jenis` ENUM('REGULER', 'EMERGENCY') NOT NULL,
    `kronologi` TEXT NOT NULL,
    `waktuKejadian` DATETIME(3) NOT NULL,
    `detailLokasi` TEXT NOT NULL,
    `isAnonim` BOOLEAN NOT NULL DEFAULT false,
    `tingkatUrgensi` ENUM('RENDAH', 'SEDANG', 'TINGGI', 'DARURAT') NOT NULL,
    `status` ENUM('DITERIMA', 'REVIEW', 'DIVERIFIKASI', 'DITANGANI', 'SELESAI', 'TIDAK_VALID', 'DITUTUP') NOT NULL DEFAULT 'DITERIMA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pelaporId` VARCHAR(191) NOT NULL,
    `kategoriId` VARCHAR(191) NOT NULL,
    `lokasiId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Laporan_nomorKasus_key`(`nomorKasus`),
    PRIMARY KEY (`idLaporan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PihakTerlibat` (
    `idPihak` VARCHAR(30) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `peran` ENUM('KORBAN', 'PELAKU', 'SAKSI', 'LAINNYA') NOT NULL,
    `keterangan` TEXT NULL,
    `laporanId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idPihak`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuktiLaporan` (
    `idBukti` VARCHAR(30) NOT NULL,
    `namaFile` VARCHAR(255) NOT NULL,
    `tipeFile` VARCHAR(100) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `uploadAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `laporanId` VARCHAR(191) NOT NULL,
    `pelaporId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idBukti`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermintaanInformasi` (
    `idPermintaan` VARCHAR(30) NOT NULL,
    `isiPermintaan` TEXT NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('TERKIRIM', 'DIBACA', 'DITANGGAPI', 'SELESAI') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `laporanId` VARCHAR(191) NOT NULL,
    `satgasId` VARCHAR(191) NOT NULL,
    `pelaporId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idPermintaan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiwayatPenanganan` (
    `idRiwayat` VARCHAR(30) NOT NULL,
    `jenisAktivitas` VARCHAR(150) NOT NULL,
    `statusLama` ENUM('DITERIMA', 'REVIEW', 'DIVERIFIKASI', 'DITANGANI', 'SELESAI', 'TIDAK_VALID', 'DITUTUP') NULL,
    `statusBaru` ENUM('DITERIMA', 'REVIEW', 'DIVERIFIKASI', 'DITANGANI', 'SELESAI', 'TIDAK_VALID', 'DITUTUP') NULL,
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `laporanId` VARCHAR(191) NOT NULL,
    `satgasId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idRiwayat`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HasilPemeriksaan` (
    `idHasil` VARCHAR(30) NOT NULL,
    `tanggalPemeriksaan` DATETIME(3) NOT NULL,
    `hasil` TEXT NOT NULL,
    `keputusan` ENUM('TERBUKTI', 'TIDAK_TERBUKTI', 'TIDAK_VALID', 'LAINNYA') NOT NULL,
    `kesimpulan` TEXT NOT NULL,
    `tindakLanjut` TEXT NOT NULL,
    `tanggalTindakan` DATETIME(3) NULL,
    `laporanId` VARCHAR(191) NOT NULL,
    `satgasId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idHasil`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notifikasi` (
    `idNotif` VARCHAR(30) NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `pesan` TEXT NOT NULL,
    `tipe` VARCHAR(50) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `laporanId` VARCHAR(191) NULL,
    `pelaporId` VARCHAR(191) NULL,
    `satgasId` VARCHAR(191) NULL,
    `incidentAlertId` VARCHAR(191) NULL,

    PRIMARY KEY (`idNotif`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CCTV` (
    `idCCTV` VARCHAR(30) NOT NULL,
    `kodeKamera` VARCHAR(100) NOT NULL,
    `posisi` VARCHAR(255) NOT NULL,
    `streamUrl` VARCHAR(500) NOT NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT true,
    `lokasiId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CCTV_kodeKamera_key`(`kodeKamera`),
    PRIMARY KEY (`idCCTV`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeteksiAI` (
    `idAI` VARCHAR(30) NOT NULL,
    `waktuDeteksi` DATETIME(3) NOT NULL,
    `jenisIsyarat` VARCHAR(100) NOT NULL,
    `confidenceScore` DECIMAL(5, 4) NOT NULL,
    `memenuhiThreshold` BOOLEAN NOT NULL,
    `snapshotUrl` VARCHAR(500) NULL,
    `cctvId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idAI`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IncidentAlert` (
    `idIncident` VARCHAR(30) NOT NULL,
    `statusVerifikasi` ENUM('PENDING', 'TERVERIFIKASI', 'DITOLAK') NOT NULL DEFAULT 'PENDING',
    `statusPengiriman` ENUM('BELUM_DIKIRIM', 'TERKIRIM', 'GAGAL') NOT NULL DEFAULT 'BELUM_DIKIRIM',
    `catatanVerifikasi` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deteksiAIId` VARCHAR(191) NOT NULL,
    `laporanId` VARCHAR(191) NULL,

    UNIQUE INDEX `IncidentAlert_deteksiAIId_key`(`deteksiAIId`),
    PRIMARY KEY (`idIncident`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuktiCCTV` (
    `idBuktiCCTV` VARCHAR(30) NOT NULL,
    `tanggalRekaman` DATETIME(3) NOT NULL,
    `timestampMulai` DATETIME(3) NOT NULL,
    `timestampAkhir` DATETIME(3) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `catatan` TEXT NULL,
    `laporanId` VARCHAR(191) NOT NULL,
    `cctvId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idBuktiCCTV`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KontenEdukasi` (
    `idEdukasi` VARCHAR(30) NOT NULL,
    `judul` VARCHAR(255) NOT NULL,
    `kategori` VARCHAR(100) NOT NULL,
    `isi` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `mediaUrl` VARCHAR(500) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `satgasId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`idEdukasi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Laporan` ADD CONSTRAINT `Laporan_pelaporId_fkey` FOREIGN KEY (`pelaporId`) REFERENCES `Pelapor`(`idPelapor`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laporan` ADD CONSTRAINT `Laporan_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `KategoriKasus`(`idKategori`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laporan` ADD CONSTRAINT `Laporan_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`idLokasi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PihakTerlibat` ADD CONSTRAINT `PihakTerlibat_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuktiLaporan` ADD CONSTRAINT `BuktiLaporan_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuktiLaporan` ADD CONSTRAINT `BuktiLaporan_pelaporId_fkey` FOREIGN KEY (`pelaporId`) REFERENCES `Pelapor`(`idPelapor`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermintaanInformasi` ADD CONSTRAINT `PermintaanInformasi_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermintaanInformasi` ADD CONSTRAINT `PermintaanInformasi_satgasId_fkey` FOREIGN KEY (`satgasId`) REFERENCES `SatgasPPKS`(`idSatgasPPKS`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermintaanInformasi` ADD CONSTRAINT `PermintaanInformasi_pelaporId_fkey` FOREIGN KEY (`pelaporId`) REFERENCES `Pelapor`(`idPelapor`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiwayatPenanganan` ADD CONSTRAINT `RiwayatPenanganan_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiwayatPenanganan` ADD CONSTRAINT `RiwayatPenanganan_satgasId_fkey` FOREIGN KEY (`satgasId`) REFERENCES `SatgasPPKS`(`idSatgasPPKS`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HasilPemeriksaan` ADD CONSTRAINT `HasilPemeriksaan_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HasilPemeriksaan` ADD CONSTRAINT `HasilPemeriksaan_satgasId_fkey` FOREIGN KEY (`satgasId`) REFERENCES `SatgasPPKS`(`idSatgasPPKS`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notifikasi` ADD CONSTRAINT `Notifikasi_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notifikasi` ADD CONSTRAINT `Notifikasi_pelaporId_fkey` FOREIGN KEY (`pelaporId`) REFERENCES `Pelapor`(`idPelapor`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notifikasi` ADD CONSTRAINT `Notifikasi_satgasId_fkey` FOREIGN KEY (`satgasId`) REFERENCES `SatgasPPKS`(`idSatgasPPKS`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notifikasi` ADD CONSTRAINT `Notifikasi_incidentAlertId_fkey` FOREIGN KEY (`incidentAlertId`) REFERENCES `IncidentAlert`(`idIncident`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CCTV` ADD CONSTRAINT `CCTV_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`idLokasi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeteksiAI` ADD CONSTRAINT `DeteksiAI_cctvId_fkey` FOREIGN KEY (`cctvId`) REFERENCES `CCTV`(`idCCTV`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentAlert` ADD CONSTRAINT `IncidentAlert_deteksiAIId_fkey` FOREIGN KEY (`deteksiAIId`) REFERENCES `DeteksiAI`(`idAI`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentAlert` ADD CONSTRAINT `IncidentAlert_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuktiCCTV` ADD CONSTRAINT `BuktiCCTV_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `Laporan`(`idLaporan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuktiCCTV` ADD CONSTRAINT `BuktiCCTV_cctvId_fkey` FOREIGN KEY (`cctvId`) REFERENCES `CCTV`(`idCCTV`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KontenEdukasi` ADD CONSTRAINT `KontenEdukasi_satgasId_fkey` FOREIGN KEY (`satgasId`) REFERENCES `SatgasPPKS`(`idSatgasPPKS`) ON DELETE RESTRICT ON UPDATE CASCADE;
