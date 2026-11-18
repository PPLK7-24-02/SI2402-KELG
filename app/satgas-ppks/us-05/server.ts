import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { z } from "zod";

export class FeatureError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: "US05_CREATE_NOT_WRITTEN" | "US05_CREATE_CONFLICT") {
    super(message);
  }
}

export async function currentSatgas() {
  const user = (await getServerSession(authOptions))?.user;
  if (!user?.id) throw new FeatureError(401, "Silakan masuk kembali.");
  if (user.role !== "SATGAS") throw new FeatureError(403, "Akses hanya untuk Satgas PPKS.");
  const account = await prisma.satgasPPKS.findUnique({
    where: { idSatgasPPKS: user.id },
    select: { idSatgasPPKS: true, nama: true },
  });
  if (!account) throw new FeatureError(403, "Akun Satgas tidak tersedia.");
  return account;
}

export function json(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
}

export async function withSatgas(
  operation: (account: Awaited<ReturnType<typeof currentSatgas>>) => Promise<Response>,
  options: { create?: boolean } = {},
) {
  let enteredOperation = false;
  try {
    const account = await currentSatgas();
    enteredOperation = true;
    return await operation(account);
  } catch (error) {
    // Do not expose database errors, submitted notes, or credentials.
    return NextResponse.json({
      success: false,
      message: error instanceof FeatureError ? error.message : "Permintaan US-05 belum berhasil. Silakan coba kembali.",
      code: error instanceof FeatureError ? error.code ??
        (!enteredOperation && options.create ? "US05_CREATE_NOT_WRITTEN" : undefined) : undefined,
    }, {
      status: error instanceof FeatureError ? error.status : 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new FeatureError(400, "Data tidak valid. Periksa isian, keputusan, dan tanggal.");
  return result.data;
}

export function query(request: Request) {
  const params = new URL(request.url).searchParams;
  // Reject duplicate keys instead of silently selecting a value.
  if (new Set(params.keys()).size !== [...params].length) {
    throw new FeatureError(400, "Parameter tidak valid.");
  }
  return Object.fromEntries(params);
}

export async function readBody(request: Request): Promise<unknown> {
  if (request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site") {
    throw new FeatureError(403, "Asal permintaan tidak diizinkan.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new FeatureError(415, "Gunakan data JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new FeatureError(400, "Data tidak valid.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 250_000) {
        await reader.cancel();
        throw new FeatureError(413, "Data terlalu besar.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new FeatureError(400, "Data JSON tidak valid."); }
}
