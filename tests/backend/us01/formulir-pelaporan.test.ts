/**
 * @jest-environment node
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeAll,
  beforeEach,
} from "@jest/globals";

// =====================================================
// 1. MOCK DEPENDENCIES
// =====================================================
// Memakai jest.doMock (tidak di-hoist) lalu me-require route
// SETELAH semua mock terpasang.

const getServerSessionMock: any = jest.fn();

const prismaMock: any = {
  kategoriKasus: {
    findUnique: jest.fn(),
  },
  lokasi: {
    findUnique: jest.fn(),
  },
  laporan: {
    create: jest.fn(),
  },
};

const fsMock: any = {
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
};

jest.doMock("next-auth", () => ({
  __esModule: true,
  getServerSession: getServerSessionMock,
}));

jest.doMock("next-auth/next", () => ({
  __esModule: true,
  getServerSession: getServerSessionMock,
}));

jest.doMock("@/lib/auth", () => ({
  __esModule: true,
  authOptions: {},
}));

jest.doMock("@/lib/prisma", () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
}));

jest.doMock("node:fs/promises", () => ({
  __esModule: true,
  ...fsMock,
  default: fsMock,
}));

jest.doMock("fs/promises", () => ({
  __esModule: true,
  ...fsMock,
  default: fsMock,
}));

jest.doMock("@/lib/report-files", () => ({
  __esModule: true,
  getReportUploadDirectory: jest.fn(() => "/tmp/safe-space-test"),
  MAX_REPORT_FILES: 5,
  MAX_REPORT_FILE_SIZE: 20 * 1024 * 1024,
  REPORT_FILE_TYPES: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/pdf": "pdf",
    "audio/mpeg": "mp3",
    "video/mp4": "mp4",
  },
}));

// POST di-load di beforeAll, setelah mock terpasang.
let POST: (request: Request) => Promise<Response>;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  POST = require("@/app/api/laporan/route").POST;
});

// =====================================================
// 2. ALIAS FUNGSI MOCK
// =====================================================

const mkdirMock = fsMock.mkdir;
const writeFileMock = fsMock.writeFile;
const unlinkMock = fsMock.unlink;

const kategoriMock = prismaMock.kategoriKasus.findUnique;
const lokasiMock = prismaMock.lokasi.findUnique;
const laporanMock = prismaMock.laporan.create;

// =====================================================
// 3. DATA DUMMY
// =====================================================
// CATATAN: field pihak terlibat harus "peran" (bukan "role")
// sesuai pihakTerlibatSchema di app/api/laporan/route.ts.

const validData = {
  kategoriId: "kategori-001",
  lokasiId: "lokasi-001",
  kronologi: "Terjadi tindakan kekerasan verbal.",
  waktuKejadian: "2026-11-10T10:30:00.000Z",
  detailLokasi: "Gedung A lantai 2",
  keteranganTambahan: "Keterangan tambahan laporan.",
  isAnonim: "false",

  pihakTerlibat: JSON.stringify([
    {
      nama: "Pihak terkait",
      peran: "SAKSI",
      keterangan: "Melihat kejadian",
    },
  ]),
};

// =====================================================
// 4. HELPER
// =====================================================

function createFormData(
  overrides: Record<string, string> = {},
  files: File[] = []
): FormData {
  const formData = new FormData();

  const data = {
    ...validData,
    ...overrides,
  };

  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  files.forEach((file) => {
    formData.append("lampiran", file);
  });

  return formData;
}

function createRequest(formData: FormData): Request {
  return new Request("http://localhost:3000/api/laporan", {
    method: "POST",
    body: formData,
  });
}

function createFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

async function sendReport(
  overrides: Record<string, string> = {},
  files: File[] = []
) {
  const formData = createFormData(overrides, files);
  const request = createRequest(formData);

  return POST(request);
}

// Memastikan penolakan 400 terjadi karena field yang dimaksud,
// bukan karena alasan lain.
function expectFieldError(body: any, field: string) {
  expect(body.errors).toEqual(
    expect.arrayContaining([expect.objectContaining({ field })])
  );
}

// =====================================================
// 5. WHITE BOX TESTING US-01
// =====================================================

describe("WHITE BOX TESTING - US-01 FORMULIR PELAPORAN KASUS", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getServerSessionMock.mockResolvedValue({
      user: {
        id: "pelapor-001",
        role: "PELAPOR",
      },
    });

    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);

    kategoriMock.mockResolvedValue({
      idKategori: "kategori-001",
    });

    lokasiMock.mockResolvedValue({
      idLokasi: "lokasi-001",
    });

    laporanMock.mockImplementation(async (args: any) => {
      const bukti = args.data.buktiLaporan?.create ?? [];

      const lampiran = bukti.map((item: any, index: number) => ({
        idBukti: `bukti-${index + 1}`,
        namaFile: item.namaFile,
        tipeFile: item.tipeFile,
      }));

      return {
        idLaporan: "laporan-001",
        nomorKasus: args.data.nomorKasus,
        createdAt: new Date(),
        buktiLaporan: lampiran,
      };
    });
  });

  // TS01 - FORMULIR LENGKAP
  it("TS01 - Berhasil mengirim formulir dengan data lengkap", async () => {
    const response = await sendReport();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Laporan berhasil dikirim.");
    expect(laporanMock).toHaveBeenCalledTimes(1);
  });

  // TS02 - KATEGORI KOSONG
  it("TS02 - Menolak laporan jika kategori kosong", async () => {
    const response = await sendReport({ kategoriId: "" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expectFieldError(body, "kategoriId");
    expect(laporanMock).not.toHaveBeenCalled();
  });

  // TS03 - KRONOLOGI KOSONG
  it("TS03 - Menolak laporan jika kronologi kosong", async () => {
    const response = await sendReport({ kronologi: "" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expectFieldError(body, "kronologi");
    expect(laporanMock).not.toHaveBeenCalled();
  });

  // TS04 - WAKTU KEJADIAN KOSONG
  it("TS04 - Menolak laporan jika waktu kejadian kosong", async () => {
    const response = await sendReport({ waktuKejadian: "" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expectFieldError(body, "waktuKejadian");
    expect(laporanMock).not.toHaveBeenCalled();
  });

  // TS05 - FORMAT TANGGAL SALAH
  it("TS05 - Menolak format waktu kejadian tidak valid", async () => {
    const response = await sendReport({ waktuKejadian: "31-99-2026" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expectFieldError(body, "waktuKejadian");
    expect(laporanMock).not.toHaveBeenCalled();
  });

  // TS06 - DETAIL LOKASI KOSONG
  it("TS06 - Menolak laporan jika detail lokasi kosong", async () => {
    const response = await sendReport({ detailLokasi: "" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expectFieldError(body, "detailLokasi");
    expect(laporanMock).not.toHaveBeenCalled();
  });

  // TS07 - KETERANGAN TAMBAHAN
  it("TS07 - Berhasil menyimpan keterangan tambahan", async () => {
    const keterangan = "Kejadian berlangsung saat kegiatan kampus.";

    const response = await sendReport({
      keteranganTambahan: keterangan,
    });

    expect(response.status).toBe(201);

    const savedData = laporanMock.mock.calls[0][0];

    expect(savedData.data.keteranganTambahan).toBe(keterangan);
  });

  // TS08 - IDENTITAS TERIDENTIFIKASI
  it("TS08 - Menyimpan laporan dengan identitas teridentifikasi", async () => {
    const response = await sendReport({ isAnonim: "false" });

    expect(response.status).toBe(201);

    const savedData = laporanMock.mock.calls[0][0];

    expect(savedData.data.isAnonim).toBe(false);
    expect(savedData.data.pelapor.connect.idPelapor).toBe("pelapor-001");
  });

  // TS09 - IDENTITAS ANONIM
  it("TS09 - Menyimpan laporan dengan identitas anonim", async () => {
    const response = await sendReport({ isAnonim: "true" });
    const body = await response.json();

    expect(response.status).toBe(201);

    const savedData = laporanMock.mock.calls[0][0];

    expect(savedData.data.isAnonim).toBe(true);

    // Identitas tetap terhubung secara internal
    expect(savedData.data.pelapor.connect.idPelapor).toBe("pelapor-001");

    // ID pelapor tidak ditampilkan pada response
    expect(body.data).not.toHaveProperty("idPelapor");
  });

  // TS10 - UPLOAD GAMBAR
  it("TS10 - Menerima file gambar JPG", async () => {
    const file = createFile("bukti.jpg", "image/jpeg");

    const response = await sendReport({}, [file]);

    expect(response.status).toBe(201);
    expect(writeFileMock).toHaveBeenCalledTimes(1);

    const savedData = laporanMock.mock.calls[0][0];

    expect(savedData.data.buktiLaporan.create[0].tipeFile).toBe(
      "image/jpeg"
    );
  });

  // TS11 - UPLOAD PDF
  it("TS11 - Menerima file dokumen PDF", async () => {
    const file = createFile("bukti.pdf", "application/pdf");

    const response = await sendReport({}, [file]);

    expect(response.status).toBe(201);
    expect(writeFileMock).toHaveBeenCalledTimes(1);

    const savedData = laporanMock.mock.calls[0][0];

    expect(savedData.data.buktiLaporan.create[0].tipeFile).toBe(
      "application/pdf"
    );
  });

  // TS12 - FORMAT FILE TIDAK DIDUKUNG
  it("TS12 - Menolak file dengan format tidak didukung", async () => {
    const file = createFile("malware.exe", "application/octet-stream");

    const response = await sendReport({}, [file]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain("tidak didukung");

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(laporanMock).not.toHaveBeenCalled();
  });

  // TS13 - UKURAN FILE TERLALU BESAR
  it("TS13 - Menolak file melebihi batas ukuran", async () => {
    const file = createFile(
      "bukti.jpg",
      "image/jpeg",
      20 * 1024 * 1024 + 1
    );

    const response = await sendReport({}, [file]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain("Ukuran file");

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(laporanMock).not.toHaveBeenCalled();
  });

  // TS14 - LAMPIRAN YANG TERSISA
  it("TS14 - Hanya memproses lampiran yang tersisa sebelum submit", async () => {
    // Backend hanya menerima file yang masih ada
    // di dalam FormData saat formulir dikirim.
    const remainingFile = createFile("bukti1.jpg", "image/jpeg");

    const response = await sendReport({}, [remainingFile]);

    expect(response.status).toBe(201);

    const savedData = laporanMock.mock.calls[0][0];

    expect(savedData.data.buktiLaporan.create).toHaveLength(1);
    expect(savedData.data.buktiLaporan.create[0].namaFile).toBe(
      "bukti1.jpg"
    );
  });

  // TS15 - CASE ID UNIK
  it("TS15 - Menghasilkan Case ID yang unik", async () => {
    const response1 = await sendReport();
    const body1 = await response1.json();

    const response2 = await sendReport();
    const body2 = await response2.json();

    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);

    expect(body1.data.caseId).toBeDefined();
    expect(body2.data.caseId).toBeDefined();

    expect(body1.data.caseId).not.toBe(body2.data.caseId);
  });

  // TS16 - DATABASE ERROR
  it("TS16 - Menangani kegagalan penyimpanan database", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const file = createFile("bukti.jpg", "image/jpeg");

      laporanMock.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await sendReport({}, [file]);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);

      // File yang sudah disimpan harus dibersihkan
      expect(unlinkMock).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
    }
  });
});
