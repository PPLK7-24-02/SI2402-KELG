import prisma from "@/lib/prisma";
import { actionSchema, idSchema } from "../../../../../contracts";
import { examinationSelect, serializeExamination } from "../../../../../examinations";
import { FeatureError, json, parse, readBody, withSatgas } from "../../../../../server";

export const runtime = "nodejs";
type Context = { params: Promise<{ idLaporan: string; idHasil: string }> };

export async function PATCH(request: Request, context: Context) {
  return withSatgas(async () => {
    const params = await context.params;
    const idLaporan = parse(idSchema, params.idLaporan);
    const idHasil = parse(idSchema, params.idHasil);
    const input = parse(actionSchema, await readBody(request));
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.hasilPemeriksaan.findFirst({
        where: { idHasil, laporanId: idLaporan }, select: { idHasil: true },
      });
      if (!existing) throw new FeatureError(404, "Hasil pemeriksaan pada kasus ini tidak ditemukan.");
      return tx.hasilPemeriksaan.update({
        where: { idHasil, laporanId: idLaporan },
        data: {
          realisasiTindakan: input.realisasiTindakan,
          tanggalTindakan: input.tanggalTindakan ? new Date(input.tanggalTindakan) : null,
          detailTindakan: input.detailTindakan,
        },
        select: examinationSelect,
      });
    });
    return json(serializeExamination(row));
  });
}
