import prisma from "@/lib/prisma";
import { createSchema, historySchema, idSchema, requestKeySchema, type CreateInput } from "../../../../contracts";
import { createRequestId, sameExaminationCore } from "../../../../create-identity";
import { examinationSelect, requireCase, serializeExamination } from "../../../../examinations";
import { FeatureError, json, parse, query, readBody, withSatgas } from "../../../../server";

export const runtime = "nodejs";
type Context = { params: Promise<{ idLaporan: string }> };

async function existingRequest(idHasil: string, laporanId: string, satgasId: string) {
  const row = await prisma.hasilPemeriksaan.findUnique({
    where: { idHasil }, select: { ...examinationSelect, satgasId: true },
  });
  if (!row) return null;
  if (row.laporanId !== laporanId || row.satgasId !== satgasId) {
    throw new FeatureError(409, "Identitas percobaan tidak cocok. Jangan kirim ulang sebagai catatan baru.", "US05_CREATE_CONFLICT");
  }
  const { satgasId: author, ...record } = row;
  // author is deliberately excluded from the response DTO.
  void author;
  return serializeExamination(record);
}

function replay(record: NonNullable<Awaited<ReturnType<typeof existingRequest>>>, input: CreateInput) {
  if (!sameExaminationCore(record, input)) {
    throw new FeatureError(409, "Isi inti berbeda dari percobaan sebelumnya. Catatan tidak ditimpa.", "US05_CREATE_CONFLICT");
  }
  return json(record);
}

export async function GET(request: Request, context: Context) {
  return withSatgas(async (account) => {
    const idLaporan = parse(idSchema, (await context.params).idLaporan);
    const { cursor } = parse(historySchema, query(request));
    await requireCase(idLaporan);
    const header = request.headers.get("Idempotency-Key");
    if (header !== null) {
      const key = parse(requestKeySchema, header);
      const idHasil = await createRequestId(account.idSatgasPPKS, idLaporan, key);
      const record = await existingRequest(idHasil, idLaporan, account.idSatgasPPKS);
      return json(record ? { state: "CONFIRMED", record } : { state: "NOT_CONFIRMED" });
    }
    const rows = await prisma.hasilPemeriksaan.findMany({
      where: { laporanId: idLaporan },
      select: examinationSelect,
      orderBy: [{ tanggalPemeriksaan: "desc" }, { idHasil: "desc" }],
      take: 21,
      ...(cursor ? { cursor: { idHasil: cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, 20);
    return json({ items: items.map(serializeExamination), nextCursor: rows.length > 20 ? items.at(-1)?.idHasil ?? null : null });
  });
}

export async function POST(request: Request, context: Context) {
  return withSatgas(async (account) => {
    let idLaporan: string, input: CreateInput, key: string | null;
    // Only these explicit failures prove this invocation never reached create().
    try {
      idLaporan = parse(idSchema, (await context.params).idLaporan);
      const header = request.headers.get("Idempotency-Key");
      key = header === null ? null : parse(requestKeySchema, header);
      input = parse(createSchema, await readBody(request));
      await requireCase(idLaporan);
    } catch (error) {
      if (error instanceof FeatureError) throw new FeatureError(error.status, error.message, "US05_CREATE_NOT_WRITTEN");
      throw error;
    }
    const idHasil = key ? await createRequestId(account.idSatgasPPKS, idLaporan, key) : null;
    if (idHasil) {
      const existing = await existingRequest(idHasil, idLaporan, account.idSatgasPPKS);
      if (existing) return replay(existing, input);
    }
    try {
      // One row insert; the primary key arbitrates concurrent requests atomically.
      const row = await prisma.hasilPemeriksaan.create({
        data: {
          ...input,
          ...(idHasil ? { idHasil } : {}),
          tanggalPemeriksaan: new Date(input.tanggalPemeriksaan),
          tanggalTindakan: input.tanggalTindakan ? new Date(input.tanggalTindakan) : null,
          laporanId: idLaporan,
          satgasId: account.idSatgasPPKS,
        },
        select: examinationSelect,
      });
      return json(serializeExamination(row), 201);
    } catch (error) {
      if (idHasil && error && typeof error === "object" && "code" in error && error.code === "P2002") {
        // Do not infer replay from P2002 alone: prove this exact primary key exists.
        const existing = await existingRequest(idHasil, idLaporan, account.idSatgasPPKS);
        if (existing) return replay(existing, input);
      }
      // Connection/commit/serialization failures remain ambiguous, without NOT_WRITTEN.
      throw error;
    }
  }, { create: true });
}
