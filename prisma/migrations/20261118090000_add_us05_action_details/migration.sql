-- US-05: preserve existing examination records; both additions are nullable.
ALTER TABLE `HasilPemeriksaan`
    ADD COLUMN `realisasiTindakan` TEXT NULL,
    ADD COLUMN `detailTindakan` TEXT NULL;
