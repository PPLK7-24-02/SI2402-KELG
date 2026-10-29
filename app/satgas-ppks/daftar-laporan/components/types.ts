export interface LaporanRow {
  idLaporan: string;
  nomorKasus: string;
  jenis: "REGULER" | "EMERGENCY";
  waktuKejadian: Date | string;
  tingkatUrgensi: "RENDAH" | "SEDANG" | "TINGGI" | "DARURAT";
  status:
    | "DITERIMA"
    | "DIVERIFIKASI"
    | "DITANGANI"
    | "SELESAI"
    | "TIDAK_VALID";
  isAnonim: boolean;
  createdAt: Date | string;
  kategori: { nama: string };
  lokasi: { namaGedung: string; area: string };
  pelapor: { nama: string; jenisPengguna: "MAHASISWA" | "STAFF" | "DOSEN" | null };
}

export interface SatgasInfo {
  name: string;
  email: string;
  initials: string;
}
