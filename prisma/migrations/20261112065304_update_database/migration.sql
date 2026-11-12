/*
  Warnings:

  - The values [REVIEW,DITUTUP] on the enum `Laporan_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [REVIEW,DITUTUP] on the enum `RiwayatPenanganan_statusBaru` will be removed. If these variants are still used in the database, this will fail.
  - The values [REVIEW,DITUTUP] on the enum `RiwayatPenanganan_statusBaru` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `laporan` MODIFY `status` ENUM('DITERIMA', 'DIVERIFIKASI', 'DITANGANI', 'SELESAI', 'TIDAK_VALID') NOT NULL DEFAULT 'DITERIMA';

-- AlterTable
ALTER TABLE `riwayatpenanganan` MODIFY `statusLama` ENUM('DITERIMA', 'DIVERIFIKASI', 'DITANGANI', 'SELESAI', 'TIDAK_VALID') NULL,
    MODIFY `statusBaru` ENUM('DITERIMA', 'DIVERIFIKASI', 'DITANGANI', 'SELESAI', 'TIDAK_VALID') NULL;
