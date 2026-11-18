import { z } from "zod";
import { KeputusanPemeriksaan } from "@/app/generated/prisma/enums";

export const keputusanLabels: Record<KeputusanPemeriksaan, string> = {
  TERBUKTI: "Terbukti",
  TIDAK_TERBUKTI: "Tidak terbukti",
  TIDAK_VALID: "Tidak valid",
  LAINNYA: "Lainnya",
};

export const idSchema = z.string().min(1).max(30);
export const requestKeySchema = z.string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .transform((key) => key.toLowerCase());
const requiredText = z.string().trim().min(1).max(10_000);
const optionalText = z.string().trim().max(10_000).nullable();
const dateTime = z.iso.datetime({ offset: true });
const actionFields = {
  realisasiTindakan: optionalText,
  tanggalTindakan: dateTime.nullable(),
  detailTindakan: optionalText,
};

export const createSchema = z.object({
  tanggalPemeriksaan: dateTime,
  hasil: requiredText,
  kesimpulan: requiredText,
  keputusan: z.enum(KeputusanPemeriksaan),
  tindakLanjut: requiredText,
  realisasiTindakan: optionalText.optional().default(null),
  tanggalTindakan: dateTime.nullable().optional().default(null),
  detailTindakan: optionalText.optional().default(null),
}).strict();

// Updates cannot change the examination, decision, plan, case, or author.
export const actionSchema = z.object(actionFields).strict();
export const listSchema = z.object({
  q: z.string().trim().max(100).default(""),
  cursor: idSchema.optional(),
}).strict();
export const historySchema = z.object({ cursor: idSchema.optional() }).strict();

export type CreateInput = z.infer<typeof createSchema>;
export type ActionInput = z.infer<typeof actionSchema>;
export type CaseOption = {
  idLaporan: string;
  nomorKasus: string;
  jenis: string;
  status: string;
};
export type Examination = {
  idHasil: string;
  laporanId: string;
  tanggalPemeriksaan: string;
  hasil: string;
  kesimpulan: string;
  keputusan: KeputusanPemeriksaan;
  tindakLanjut: string;
  realisasiTindakan: string | null;
  tanggalTindakan: string | null;
  detailTindakan: string | null;
  satgas: { nama: string };
};
export type PageData<T> = { items: T[]; nextCursor: string | null };

export const caseOptionSchema = z.object({
  idLaporan: idSchema, nomorKasus: z.string(), jenis: z.string(), status: z.string(),
});
// Read old records without imposing the new form's text length/trim rules.
export const examinationSchema = z.object({
  idHasil: idSchema,
  laporanId: idSchema,
  tanggalPemeriksaan: dateTime,
  hasil: z.string(),
  kesimpulan: z.string(),
  keputusan: z.enum(KeputusanPemeriksaan),
  tindakLanjut: z.string(),
  realisasiTindakan: z.string().nullable(),
  tanggalTindakan: dateTime.nullable(),
  detailTindakan: z.string().nullable(),
  satgas: z.object({ nama: z.string() }),
});
export const casePageSchema = z.object({
  items: z.array(caseOptionSchema), nextCursor: idSchema.nullable(),
});
export const historyPageSchema = z.object({
  items: z.array(examinationSchema), nextCursor: idSchema.nullable(),
});

export const recoverySchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("CONFIRMED"), record: examinationSchema }),
  z.object({ state: z.literal("NOT_CONFIRMED") }),
]);
