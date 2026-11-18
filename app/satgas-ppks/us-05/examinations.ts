import prisma from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Examination } from "./contracts";
import { FeatureError } from "./server";

export const examinationSelect = {
  idHasil: true,
  laporanId: true,
  tanggalPemeriksaan: true,
  hasil: true,
  kesimpulan: true,
  keputusan: true,
  tindakLanjut: true,
  realisasiTindakan: true,
  tanggalTindakan: true,
  detailTindakan: true,
  satgas: { select: { nama: true } },
} satisfies Prisma.HasilPemeriksaanSelect;

export function serializeExamination(
  row: Prisma.HasilPemeriksaanGetPayload<{ select: typeof examinationSelect }>,
): Examination {
  return {
    ...row,
    tanggalPemeriksaan: row.tanggalPemeriksaan.toISOString(),
    tanggalTindakan: row.tanggalTindakan?.toISOString() ?? null,
  };
}

export async function requireCase(idLaporan: string) {
  const report = await prisma.laporan.findUnique({
    where: { idLaporan }, select: { idLaporan: true, nomorKasus: true },
  });
  if (!report) throw new FeatureError(404, "Kasus tidak ditemukan.");
  return report;
}
