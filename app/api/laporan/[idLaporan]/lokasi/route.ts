import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(40_100_000),
  capturedAt: z.iso.datetime({ offset: true }),
}).strict();
const reply = (status: number, message: string) => NextResponse.json({ success: false, message }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function PATCH(request: Request, context: { params: Promise<{ idLaporan: string }> }) {
  try {
    const user = (await getServerSession(authOptions))?.user;
    if (!user?.id) return reply(401, "Silakan masuk kembali. Laporan SOS yang sudah tersimpan tetap ada.");
    if (user.role !== "PELAPOR") return reply(403, "Hanya pelapor yang dapat melengkapi lokasi.");
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return reply(403, "Asal permintaan tidak diizinkan.");
    if (!request.headers.get("content-type")?.includes("application/json")) return reply(415, "Gunakan data lokasi JSON.");
    const { idLaporan } = await context.params;
    if (!idLaporan || idLaporan.length > 30) return reply(404, "Laporan SOS tidak ditemukan.");
    const report = await prisma.laporan.findFirst({ where: { idLaporan, pelaporId: user.id, jenis: "EMERGENCY" }, select: { idLaporan: true } });
    if (!report) return reply(404, "Laporan SOS tidak ditemukan.");
    // GPS payloads are small; reject oversized bodies without buffering them all.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, "Data lokasi tidak valid.");
    let text = "", size = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 4096) { await reader.cancel(); return reply(413, "Data lokasi terlalu besar."); }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let body: unknown;
    try { body = JSON.parse(text); } catch { return reply(400, "Data lokasi tidak valid."); }
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) return reply(400, "Koordinat, akurasi, atau waktu pengambilan tidak valid.");
    const { latitude, longitude, accuracy, capturedAt } = parsed.data;
    if (Date.parse(capturedAt) > Date.now() + 5 * 60_000) return reply(400, "Waktu pengambilan lokasi tidak valid.");
    const detailLokasi = JSON.stringify({ source: "SOS_GPS", version: 1, latitude, longitude, accuracy, capturedAt: new Date(capturedAt).toISOString() });
    const updated = await prisma.laporan.updateMany({ where: { idLaporan, pelaporId: user.id, jenis: "EMERGENCY" }, data: { detailLokasi } });
    if (updated.count !== 1) return reply(404, "Laporan SOS tidak ditemukan.");
    return NextResponse.json({ success: true, message: "Lokasi ditambahkan ke laporan SOS.", data: parsed.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return reply(500, "Lokasi belum terkonfirmasi. Laporan SOS tetap tersimpan; Anda dapat mencoba lagi.");
  }
}
