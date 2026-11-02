import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getReportUploadDirectory,
  MAX_REPORT_FILES,
  MAX_REPORT_FILE_SIZE,
  REPORT_FILE_TYPES,
} from "@/lib/report-files";

export const runtime = "nodejs";

const pihakTerlibatSchema = z.array(
  z.object({
    nama: z.string().trim().min(1).max(150),
    peran: z.enum(["KORBAN", "PELAKU", "SAKSI", "LAINNYA"]),
    keterangan: z.string().trim().max(5000).optional(),
  })
).max(20);

const laporanSchema = z.object({
  kategoriId: z.string().trim().min(1, "Kategori wajib dipilih."),
  lokasiId: z.string().trim().min(1, "Lokasi wajib dipilih."),
  kronologi: z.string().trim().min(1, "Kronologi wajib diisi.").max(20000),
  waktuKejadian: z.string().trim().refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      !Number.isNaN(Date.parse(value)),
    "Waktu kejadian harus berupa tanggal ISO 8601 yang valid."
  ).transform((value) => new Date(value)),
  detailLokasi: z.string().trim().min(1).max(5000),
  keteranganTambahan: z.string().trim().max(10000).optional(),
  isAnonim: z.enum(["true", "false"]).default("false").transform(
    (value) => value === "true"
  ),
  pihakTerlibat: pihakTerlibatSchema,
});

function readTextField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Silakan masuk untuk mengirim laporan." },
      { status: 401 }
    );
  }

  if (session.user.role !== "PELAPOR") {
    return NextResponse.json(
      { success: false, message: "Hanya akun pelapor yang dapat mengirim laporan." },
      { status: 403 }
    );
  }

  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return NextResponse.json(
      { success: false, message: "Gunakan formulir multipart untuk mengirim laporan." },
      { status: 415 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "Data formulir tidak dapat dibaca." },
      { status: 400 }
    );
  }

  let pihakTerlibat: unknown;
  try {
    pihakTerlibat = JSON.parse(readTextField(formData, "pihakTerlibat") ?? "[]");
  } catch {
    return NextResponse.json(
      { success: false, message: "Format pihak terlibat tidak valid." },
      { status: 400 }
    );
  }

  const parsed = laporanSchema.safeParse({
    kategoriId: readTextField(formData, "kategoriId"),
    lokasiId: readTextField(formData, "lokasiId"),
    kronologi: readTextField(formData, "kronologi"),
    waktuKejadian: readTextField(formData, "waktuKejadian"),
    detailLokasi: readTextField(formData, "detailLokasi"),
    keteranganTambahan: readTextField(formData, "keteranganTambahan"),
    isAnonim: readTextField(formData, "isAnonim") ?? "false",
    pihakTerlibat,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Data laporan belum valid.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const entries = formData.getAll("lampiran");
  if (entries.some((entry) => typeof entry === "string")) {
    return NextResponse.json(
      { success: false, message: "Lampiran harus berupa file." },
      { status: 400 }
    );
  }

  const files = entries.filter(
    (entry): entry is File =>
      entry instanceof File && (entry.name.length > 0 || entry.size > 0)
  );

  if (files.length > MAX_REPORT_FILES) {
    return NextResponse.json(
      { success: false, message: `Maksimal ${MAX_REPORT_FILES} lampiran.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (!REPORT_FILE_TYPES[file.type]) {
      return NextResponse.json(
        { success: false, message: `Tipe file ${file.name} tidak didukung.` },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_REPORT_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: `Ukuran file ${file.name} harus di bawah 20 MB.` },
        { status: 400 }
      );
    }
  }

  try {
    const [kategori, lokasi] = await Promise.all([
      prisma.kategoriKasus.findUnique({
        where: { idKategori: parsed.data.kategoriId },
        select: { idKategori: true },
      }),
      prisma.lokasi.findUnique({
        where: { idLokasi: parsed.data.lokasiId },
        select: { idLokasi: true },
      }),
    ]);

    if (!kategori || !lokasi) {
      return NextResponse.json(
        { success: false, message: "Kategori atau lokasi tidak ditemukan." },
        { status: 400 }
      );
    }

    const uploadDirectory = getReportUploadDirectory();
    const savedPaths: string[] = [];
    const evidence = [];

    try {
      await mkdir(uploadDirectory, { recursive: true });

      for (const file of files) {
        const extension = REPORT_FILE_TYPES[file.type];
        const storedName = `${randomUUID()}.${extension}`;
        const savedPath = `${uploadDirectory}/${storedName}`;
        const originalName = file.name
          .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
          .slice(0, 255);

        await writeFile(savedPath, Buffer.from(await file.arrayBuffer()), {
          flag: "wx",
          mode: 0o600,
        });
        savedPaths.push(savedPath);
        evidence.push({
          namaFile: originalName || "lampiran",
          tipeFile: file.type,
          fileUrl: `private://${storedName}`,
        });
      }

      const nomorKasus = `SS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;

      const laporan = await prisma.laporan.create({
        data: {
          nomorKasus,
          jenis: "REGULER",
          kronologi: parsed.data.kronologi,
          keteranganTambahan: parsed.data.keteranganTambahan || null,
          waktuKejadian: parsed.data.waktuKejadian,
          detailLokasi: parsed.data.detailLokasi,
          isAnonim: parsed.data.isAnonim,
          tingkatUrgensi: "SEDANG",
          pelapor: { connect: { idPelapor: session.user.id } },
          kategori: { connect: { idKategori: kategori.idKategori } },
          lokasi: { connect: { idLokasi: lokasi.idLokasi } },
          pihakTerlibat: {
            create: parsed.data.pihakTerlibat.map((pihak) => ({
              nama: pihak.nama,
              peran: pihak.peran,
              keterangan: pihak.keterangan || null,
            })),
          },
          buktiLaporan: {
            create: evidence.map((item) => ({
              ...item,
              pelapor: { connect: { idPelapor: session.user.id } },
            })),
          },
        },
        select: {
          idLaporan: true,
          nomorKasus: true,
          createdAt: true,
          buktiLaporan: {
            select: { idBukti: true, namaFile: true, tipeFile: true },
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Laporan berhasil dikirim.",
          data: {
            caseId: laporan.nomorKasus,
            createdAt: laporan.createdAt,
            lampiran: laporan.buktiLaporan,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      await Promise.all(savedPaths.map((savedPath) => unlink(savedPath).catch(() => undefined)));
      throw error;
    }
  } catch (error) {
    console.error("Create report error:", error);
    return NextResponse.json(
      { success: false, message: "Laporan gagal disimpan. Silakan coba kembali." },
      { status: 500 }
    );
  }
}