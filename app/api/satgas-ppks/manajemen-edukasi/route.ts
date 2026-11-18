import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { StatusEdukasi } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const KATEGORI_EDUKASI = [
  "Pemahaman Dasar",
  "Pencegahan",
  "Hak dan Privasi",
  "Panduan Tindakan",
  "Panduan Pelaporan",
] as const;

const STATUS_EDUKASI = [StatusEdukasi.DRAFT, StatusEdukasi.PUBLISHED] as const;
const MAX_MEDIA_SIZE = 10 * 1024 * 1024;
const MEDIA_DIRECTORY = path.resolve(
  process.cwd(),
  "public",
  "edukasi"
);

const MEDIA_PATH_PREFIX = "/edukasi/";

const mediaTypes: Record<string, { mimeTypes: string[] }> = {
  jpg: { mimeTypes: ["image/jpeg"] },
  jpeg: { mimeTypes: ["image/jpeg"] },
  png: { mimeTypes: ["image/png"] },
  pdf: { mimeTypes: ["application/pdf"] },
  doc: { mimeTypes: ["application/msword"] },
  docx: {
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
};

const createSchema = z.object({
  judul: z.string().trim().min(1, "Judul wajib diisi.").max(255),
  kategori: z.enum(KATEGORI_EDUKASI, {
    error: "Kategori wajib dipilih dan harus valid.",
  }),
  isi: z.string().trim().min(1, "Isi materi wajib diisi."),
  status: z.enum(STATUS_EDUKASI, {
    error: "Status harus DRAFT atau PUBLISHED.",
  }).default(StatusEdukasi.DRAFT),
});

const updateSchema = z.object({
  idEdukasi: z.string().trim().min(1).max(30),
  judul: z.string().trim().min(1, "Judul tidak boleh kosong.").max(255).optional(),
  kategori: z.enum(KATEGORI_EDUKASI, {
    error: "Kategori yang dipilih tidak valid.",
  }).optional(),
  isi: z.string().trim().min(1, "Isi materi tidak boleh kosong.").optional(),
  status: z.enum(STATUS_EDUKASI, {
    error: "Status harus DRAFT atau PUBLISHED.",
  }).optional(),
  hapusMedia: z.enum(["true", "false"]).optional(),
});

type ControllerResult = NextResponse;

function jsonError(message: string, status: number, errors?: unknown): ControllerResult {
  return NextResponse.json(
    { success: false, message, ...(errors ? { errors } : {}) },
    { status }
  );
}

function getValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function getPrismaErrorResponse(error: unknown, operation: string): ControllerResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return jsonError("Materi edukasi tidak ditemukan.", 404);
    }
    if (error.code === "P2003") {
      return jsonError("Relasi Satgas tidak valid.", 400);
    }
    if (error.code === "P2002") {
      return jsonError("Data materi bertentangan dengan data yang sudah ada.", 409);
    }
  }

  console.error(`[MANAJEMEN_EDUKASI] ${operation}:`, error);
  return jsonError("Terjadi kesalahan saat memproses materi edukasi.", 500);
}

async function requireSatgas() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: jsonError("Silakan masuk terlebih dahulu.", 401) };
  }
  if (session.user.role !== "SATGAS") {
    return {
      response: jsonError("Hanya Satgas PPKS yang dapat mengelola materi edukasi.", 403),
    };
  }

  return { satgasId: session.user.id };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readRequestData(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const data: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        data[key] = value;
      }
    }

    const media = formData.get("media");
    return {
      data,
      media:
        media instanceof File && media.name && media.size > 0
          ? media
          : undefined,
    };
  }

  if (contentType.includes("application/json")) {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      throw new TypeError("Body JSON harus berupa object.");
    }
    return { data: body, media: undefined };
  }

  throw new TypeError("Content-Type harus multipart/form-data atau application/json.");
}

function invalidRequestResponse(error: unknown): ControllerResult {
  return jsonError(
    error instanceof Error ? error.message : "Format data permintaan tidak valid.",
    400
  );
}

function validateMedia(file: File): string | null {
  if (file.size > MAX_MEDIA_SIZE) {
    return "Ukuran media maksimal 10 MB.";
  }
  if (file.size === 0) {
    return "File media tidak boleh kosong.";
  }

  const extension = path.extname(file.name).slice(1).toLowerCase();
  const type = mediaTypes[extension];
  if (!type || !type.mimeTypes.includes(file.type)) {
    return "Format media harus JPG, JPEG, PNG, PDF, DOC, atau DOCX.";
  }

  return null;
}

async function saveMedia(file: File): Promise<{ path: string; url: string }> {
  const storedName = `${randomUUID()}.${path.extname(file.name).slice(1).toLowerCase()}`;
  const storedPath = path.resolve(MEDIA_DIRECTORY, storedName);
  if (path.dirname(storedPath) !== MEDIA_DIRECTORY) {
    throw new Error("Lokasi penyimpanan media tidak valid.");
  }

  await mkdir(MEDIA_DIRECTORY, { recursive: true });
  await writeFile(storedPath, Buffer.from(await file.arrayBuffer()), {
    flag: "wx",
    mode: 0o600,
  });

  return { path: storedPath, url: `${MEDIA_PATH_PREFIX}${storedName}` };
}

async function removeMedia(mediaUrl: string | null | undefined): Promise<void> {
  if (!mediaUrl?.startsWith(MEDIA_PATH_PREFIX)) {
    return;
  }

  const fileName = mediaUrl.slice(MEDIA_PATH_PREFIX.length);
  if (!fileName || path.basename(fileName) !== fileName) {
    return;
  }

  const filePath = path.resolve(MEDIA_DIRECTORY, fileName);
  if (path.dirname(filePath) !== MEDIA_DIRECTORY) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

function validateId(id: string | null | undefined): string | null {
  if (typeof id !== "string" || !id.trim() || id.trim().length > 30) {
    return null;
  }
  return id.trim();
}

async function getAllKontenEdukasi(): Promise<ControllerResult> {
  const access = await requireSatgas();
  if (access.response) return access.response;

  try {
    const konten = await prisma.kontenEdukasi.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, data: konten });
  } catch (error) {
    return getPrismaErrorResponse(error, "Gagal mengambil daftar materi");
  }
}

async function getKontenEdukasiById(
  rawId: string | null | undefined
): Promise<ControllerResult> {
  const idEdukasi = validateId(rawId);
  if (!idEdukasi) return jsonError("ID materi edukasi tidak valid.", 400);

  const access = await requireSatgas();
  if (access.response) return access.response;

  try {
    const konten = await prisma.kontenEdukasi.findUnique({
      where: { idEdukasi },
    });
    if (!konten) return jsonError("Materi edukasi tidak ditemukan.", 404);
    return NextResponse.json({ success: true, data: konten });
  } catch (error) {
    return getPrismaErrorResponse(error, "Gagal mengambil detail materi");
  }
}

async function createKontenEdukasi(request: Request): Promise<ControllerResult> {
  const access = await requireSatgas();
  if (access.response) return access.response;

  let requestData: Awaited<ReturnType<typeof readRequestData>>;
  try {
    requestData = await readRequestData(request);
  } catch (error) {
    return invalidRequestResponse(error);
  }

  const parsed = createSchema.safeParse(requestData.data);
  if (!parsed.success) {
    return jsonError("Data materi edukasi belum valid.", 400, getValidationErrors(parsed.error));
  }

  if (requestData.media) {
    const mediaError = validateMedia(requestData.media);
    if (mediaError) return jsonError(mediaError, 400);
  }

  let savedMedia: Awaited<ReturnType<typeof saveMedia>> | undefined;
  try {
    if (requestData.media) savedMedia = await saveMedia(requestData.media);

    const konten = await prisma.kontenEdukasi.create({
      data: {
        judul: parsed.data.judul,
        kategori: parsed.data.kategori,
        isi: parsed.data.isi,
        status: parsed.data.status,
        mediaUrl: savedMedia?.url ?? null,
        satgasId: access.satgasId,
      },
    });
    return NextResponse.json(
      { success: true, message: "Materi edukasi berhasil ditambahkan.", data: konten },
      { status: 201 }
    );
  } catch (error) {
    if (savedMedia) {
      try {
        await removeMedia(savedMedia.url);
      } catch (cleanupError) {
        console.error("[MANAJEMEN_EDUKASI] Gagal membersihkan media baru:", cleanupError);
      }
    }
    return getPrismaErrorResponse(error, "Gagal membuat materi");
  }
}

async function updateKontenEdukasi(
  request: Request,
  requestData?: Awaited<ReturnType<typeof readRequestData>>
): Promise<ControllerResult> {
  const access = await requireSatgas();
  if (access.response) return access.response;

  if (!requestData) {
    try {
      requestData = await readRequestData(request);
    } catch (error) {
      return invalidRequestResponse(error);
    }
  }

  const parsed = updateSchema.safeParse(requestData.data);
  if (!parsed.success) {
    return jsonError("Data pembaruan materi tidak valid.", 400, getValidationErrors(parsed.error));
  }
  const { idEdukasi, hapusMedia, ...fields } = parsed.data;
  if (
    fields.judul === undefined &&
    fields.kategori === undefined &&
    fields.isi === undefined &&
    fields.status === undefined &&
    !requestData.media &&
    hapusMedia !== "true"
  ) {
    return jsonError("Tidak ada perubahan materi yang dikirim.", 400);
  }
  if (requestData.media) {
    const mediaError = validateMedia(requestData.media);
    if (mediaError) return jsonError(mediaError, 400);
  }

  let savedMedia: Awaited<ReturnType<typeof saveMedia>> | undefined;
  try {
    const existing = await prisma.kontenEdukasi.findUnique({ where: { idEdukasi } });
    if (!existing) return jsonError("Materi edukasi tidak ditemukan.", 404);

    if (requestData.media) savedMedia = await saveMedia(requestData.media);

    const updateData = {
      ...fields,
      ...(savedMedia
        ? { mediaUrl: savedMedia.url }
        : hapusMedia === "true"
          ? { mediaUrl: null }
          : {}),
    };
    const konten = await prisma.kontenEdukasi.update({
      where: { idEdukasi },
      data: updateData,
    });

    if ((savedMedia || hapusMedia === "true") && existing.mediaUrl) {
      try {
        await removeMedia(existing.mediaUrl);
      } catch (cleanupError) {
        console.error("[MANAJEMEN_EDUKASI] Gagal menghapus media lama:", cleanupError);
        return NextResponse.json({
          success: true,
          message: "Materi diperbarui, tetapi media lama gagal dihapus.",
          data: konten,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Materi edukasi berhasil diperbarui.",
      data: konten,
    });
  } catch (error) {
    if (savedMedia) {
      try {
        await removeMedia(savedMedia.url);
      } catch (cleanupError) {
        console.error("[MANAJEMEN_EDUKASI] Gagal membersihkan media baru:", cleanupError);
      }
    }
    return getPrismaErrorResponse(error, "Gagal memperbarui materi");
  }
}

async function deleteKontenEdukasi(rawId: string | null | undefined): Promise<ControllerResult> {
  const access = await requireSatgas();
  if (access.response) return access.response;

  const idEdukasi = validateId(rawId);
  if (!idEdukasi) return jsonError("ID materi edukasi tidak valid.", 400);

  try {
    const konten = await prisma.kontenEdukasi.findUnique({ where: { idEdukasi } });
    if (!konten) return jsonError("Materi edukasi tidak ditemukan.", 404);

    await prisma.kontenEdukasi.delete({ where: { idEdukasi } });
    try {
      await removeMedia(konten.mediaUrl);
    } catch (cleanupError) {
      console.error("[MANAJEMEN_EDUKASI] Gagal menghapus media materi:", cleanupError);
      return NextResponse.json({
        success: true,
        message: "Materi berhasil dihapus, tetapi file media gagal dihapus.",
      });
    }
    return NextResponse.json({ success: true, message: "Materi edukasi berhasil dihapus." });
  } catch (error) {
    return getPrismaErrorResponse(error, "Gagal menghapus materi");
  }
}

async function updateStatusPublikasi(
  rawId: string | null | undefined
): Promise<ControllerResult> {
  const access = await requireSatgas();
  if (access.response) return access.response;

  const idEdukasi = validateId(rawId);
  if (!idEdukasi) return jsonError("ID materi edukasi tidak valid.", 400);

  try {
    const existing = await prisma.kontenEdukasi.findUnique({ where: { idEdukasi } });
    if (!existing) return jsonError("Materi edukasi tidak ditemukan.", 404);

    const status =
      existing.status === StatusEdukasi.DRAFT
        ? StatusEdukasi.PUBLISHED
        : StatusEdukasi.DRAFT;
    const konten = await prisma.kontenEdukasi.update({
      where: { idEdukasi },
      data: { status },
    });
    return NextResponse.json({
      success: true,
      message: `Status materi berhasil diubah menjadi ${status}.`,
      data: konten,
    });
  } catch (error) {
    return getPrismaErrorResponse(error, "Gagal mengubah status publikasi");
  }
}

async function getPublishedKontenEdukasi(
  rawId?: string | null
): Promise<ControllerResult> {
  const idEdukasi = rawId === undefined || rawId === null ? undefined : validateId(rawId);
  if (rawId !== undefined && rawId !== null && !idEdukasi) {
    return jsonError("ID materi edukasi tidak valid.", 400);
  }

  try {
    if (idEdukasi) {
      const konten = await prisma.kontenEdukasi.findFirst({
        where: { idEdukasi, status: StatusEdukasi.PUBLISHED },
      });
      if (!konten) return jsonError("Materi edukasi tidak ditemukan.", 404);
      return NextResponse.json({ success: true, data: konten });
    }

    const konten = await prisma.kontenEdukasi.findMany({
      where: { status: StatusEdukasi.PUBLISHED },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, data: konten });
  } catch (error) {
    return getPrismaErrorResponse(error, "Gagal mengambil materi yang dipublikasikan");
  }
}

export async function GET(request: NextRequest): Promise<ControllerResult> {
  const id = request.nextUrl.searchParams.get("id");
  if (request.nextUrl.searchParams.get("published") === "true") {
    return getPublishedKontenEdukasi(id);
  }

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role === "SATGAS" && session.user.id) {
      return id ? getKontenEdukasiById(id) : getAllKontenEdukasi();
    }
    return getPublishedKontenEdukasi(id);
  } catch (error) {
    return getPrismaErrorResponse(error, "Gagal memeriksa akses materi");
  }
}

export async function POST(request: Request): Promise<ControllerResult> {
  return createKontenEdukasi(request);
}

export async function PUT(request: NextRequest): Promise<ControllerResult> {
  try {
    const access = await requireSatgas();
    if (access.response) return access.response;
  } catch (error) {
    return getPrismaErrorResponse(error, "Gagal memeriksa akses pembaruan materi");
  }

  let requestData: Awaited<ReturnType<typeof readRequestData>>;
  try {
    requestData = await readRequestData(request);
  } catch (error) {
    return invalidRequestResponse(error);
  }

  if (requestData.data.action === "status" || requestData.data.statusOnly === true) {
    return updateStatusPublikasi(
      typeof requestData.data.idEdukasi === "string"
        ? requestData.data.idEdukasi
        : null
    );
  }
  return updateKontenEdukasi(request, requestData);
}

export async function DELETE(request: NextRequest): Promise<ControllerResult> {
  return deleteKontenEdukasi(request.nextUrl.searchParams.get("id"));
}