import { createHash } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MAX_REPORT_FILES, MAX_REPORT_FILE_SIZE, normalizeEmergencyMediaType, validEmergencyMedia, saveEmergencyMedia, removeNewEmergencyMedia } from "@/lib/report-files";

export const runtime = "nodejs";
class UploadError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const select = { idBukti: true, namaFile: true, tipeFile: true } as const;
const reply = (status: number, message: string, code?: "UPLOAD_REJECTED_BEFORE_WRITE") => NextResponse.json({ success: false, message, ...(code ? { code } : {}) }, { status, headers: { "Cache-Control": "private, no-store" } });
// Describes this attempt only; it cannot disprove an earlier retry's commit.
const rejectBeforeWrite = (status: number, message: string) => reply(status, message, "UPLOAD_REJECTED_BEFORE_WRITE");

async function readMultipart(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError(400, "Lampiran tidak tersedia.");
  let size = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) { controller.close(); reader.releaseLock(); return; }
        size += next.value.length;
        if (size > MAX_REPORT_FILES * MAX_REPORT_FILE_SIZE + 1024 * 1024) {
          await reader.cancel();
          controller.error(new UploadError(413, "Ukuran total lampiran terlalu besar."));
          return;
        }
        controller.enqueue(next.value);
      } catch { controller.error(new UploadError(400, "Lampiran tidak dapat dibaca.")); }
    },
    cancel: reason => reader.cancel(reason),
  });
  try { return await new Response(stream, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData(); }
  catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError(400, "Formulir lampiran tidak valid atau terlalu besar.");
  }
}

export async function POST(request: Request, context: { params: Promise<{ idLaporan: string }> }) {
  const written: { savedPath: string; fileUrl: string }[] = [];
  let storageStarted = false;
  let transactionAttempted = false;
  let evidenceIds: string[] = [];
  let ownerId = "", reportId = "";
  try {
    const user = (await getServerSession(authOptions))?.user;
    if (!user?.id) return rejectBeforeWrite(401, "Silakan masuk kembali. Laporan SOS tetap tersimpan.");
    if (user.role !== "PELAPOR") return rejectBeforeWrite(403, "Hanya pelapor yang dapat mengunggah bukti.");
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return rejectBeforeWrite(403, "Asal permintaan tidak diizinkan.");
    const key = request.headers.get("idempotency-key")?.trim().toLowerCase();
    if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key)) return rejectBeforeWrite(400, "Key upload wajib UUID v4; gunakan key yang sama saat retry.");
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) return rejectBeforeWrite(415, "Gunakan lampiran multipart.");
    const { idLaporan } = await context.params;
    if (!idLaporan || idLaporan.length > 30) return rejectBeforeWrite(404, "Laporan SOS tidak ditemukan.");
    ownerId = user.id; reportId = idLaporan;
    const report = await prisma.laporan.findFirst({ where: { idLaporan, pelaporId: user.id, jenis: "EMERGENCY" }, select: { idLaporan: true } });
    if (!report) return rejectBeforeWrite(404, "Laporan SOS tidak ditemukan.");
    const form = await readMultipart(request);
    const entries = form.getAll("lampiran");
    if (!entries.length || entries.length > MAX_REPORT_FILES || entries.some(item => !(item instanceof File))) throw new UploadError(400, "Pilih 1–5 foto atau video.");
    const prepared = [];
    for (const [index, item] of entries.entries()) {
      if (!(item instanceof File)) throw new UploadError(400, "Lampiran harus berupa file.");
      const type = normalizeEmergencyMediaType(item.type);
      if (!type || !item.size || item.size > MAX_REPORT_FILE_SIZE) throw new UploadError(400, "Foto/video harus berformat JPEG, PNG, WEBP, MP4, WEBM, atau MOV, maksimal 20 MiB per file.");
      const bytes = Buffer.from(await item.arrayBuffer());
      if (!validEmergencyMedia(bytes, type)) throw new UploadError(400, "Isi file tidak sesuai format foto/video yang didukung.");
      const name = item.name.replace(/[\\/\u0000-\u001f\u007f]/g, "_").slice(0, 255) || "bukti-sos";
      const idBukti = `ev${createHash("sha256").update(JSON.stringify([user.id, idLaporan, key, index, name, type, createHash("sha256").update(bytes).digest("hex")])).digest("hex").slice(0, 28)}`;
      prepared.push({ idBukti, namaFile: name, tipeFile: type, bytes });
    }
    evidenceIds = prepared.map(item => item.idBukti);
    // Fast replay avoids writing duplicate private files on a lost-response retry.
    const replay = await prisma.buktiLaporan.findMany({ where: { idBukti: { in: evidenceIds }, laporanId: idLaporan, pelaporId: user.id }, select });
    if (replay.length === prepared.length) return NextResponse.json({ success: true, data: { lampiran: replay, replayed: true } }, { headers: { "Cache-Control": "private, no-store" } });
    const data: Prisma.BuktiLaporanCreateManyInput[] = [];
    for (const item of prepared) {
      // Set before calling storage: a thrown write may already have created bytes.
      storageStarted = true;
      const saved = await saveEmergencyMedia(item.bytes, item.tipeFile);
      written.push(saved);
      data.push({ idBukti: item.idBukti, namaFile: item.namaFile, tipeFile: item.tipeFile, fileUrl: saved.fileUrl, laporanId: idLaporan, pelaporId: user.id });
    }
    transactionAttempted = true;
    const result = await prisma.$transaction(async tx => {
      // Serializes append requests for this report across processes, not a JS lock.
      const locked = await tx.$queryRaw<{ idLaporan: string }[]>`SELECT idLaporan FROM Laporan WHERE idLaporan = ${idLaporan} AND pelaporId = ${user.id} AND jenis = 'EMERGENCY' FOR UPDATE`;
      if (locked.length !== 1) throw new UploadError(404, "Laporan SOS tidak ditemukan.");
      const existing = await tx.buktiLaporan.findMany({ where: { idBukti: { in: evidenceIds }, laporanId: idLaporan, pelaporId: user.id }, select });
      if (existing.length === prepared.length) return { lampiran: existing, replayed: true };
      if (existing.length) throw new UploadError(409, "Batch bukti tidak konsisten. Tinjau lampiran sebelum mencoba lagi.");
      const count = await tx.buktiLaporan.count({ where: { laporanId: idLaporan } });
      if (count + data.length > MAX_REPORT_FILES) throw new UploadError(409, "Laporan sudah mencapai batas 5 bukti. Laporan SOS tetap tersimpan.");
      await tx.buktiLaporan.createMany({ data });
      return { lampiran: await tx.buktiLaporan.findMany({ where: { idBukti: { in: evidenceIds } }, select }), replayed: false };
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
    if (result.replayed) await Promise.all(written.map(saved => removeNewEmergencyMedia(saved.savedPath).catch(() => undefined)));
    return NextResponse.json({ success: true, message: "Bukti ditambahkan. Laporan SOS tetap tersimpan.", data: result }, { status: result.replayed ? 200 : 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (transactionAttempted) {
      // A dropped connection can hide a successful commit. Never remove files
      // referenced by committed metadata. If verification fails, preserve them.
      try {
        const committed = await prisma.buktiLaporan.findMany({ where: { idBukti: { in: evidenceIds }, laporanId: reportId, pelaporId: ownerId }, select: { ...select, fileUrl: true } });
        if (committed.length) {
          const referenced = new Set(committed.map(item => item.fileUrl));
          await Promise.all(written.filter(saved => !referenced.has(saved.fileUrl)).map(saved => removeNewEmergencyMedia(saved.savedPath).catch(() => undefined)));
          if (committed.length === evidenceIds.length) return NextResponse.json({ success: true, data: { lampiran: committed.map(({ idBukti, namaFile, tipeFile }) => ({ idBukti, namaFile, tipeFile })), replayed: true } }, { headers: { "Cache-Control": "private, no-store" } });
          return reply(503, "Hasil upload belum pasti. Gunakan file dan key upload yang sama saat retry; laporan SOS tetap tersimpan.");
        }
      } catch { return reply(503, "Upload belum terkonfirmasi. Coba lagi dengan batch yang sama; laporan SOS tetap tersimpan."); }
    }
    await Promise.all(written.map(saved => removeNewEmergencyMedia(saved.savedPath).catch(() => undefined)));
    return error instanceof UploadError ? reply(error.status, error.message, !storageStarted ? "UPLOAD_REJECTED_BEFORE_WRITE" : undefined) : reply(503, "Bukti belum tersimpan. Ulangi upload yang sama; laporan SOS tetap tersimpan.");
  }
}
