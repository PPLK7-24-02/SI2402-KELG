import { NextRequest } from "next/server";

type JestMock<T extends (...args: never[]) => unknown> = T & {
  mock: { calls: Parameters<T>[] };
  mockResolvedValue(value: Awaited<ReturnType<T>>): void;
};

type JestMatchers = {
  not: JestMatchers;
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(expected: number): void;
  toHaveBeenCalledWith(...expected: unknown[]): void;
};

declare function describe(name: string, callback: () => void): void;
declare function it(name: string, callback: () => void | Promise<void>): void;
declare function beforeAll(callback: () => void | Promise<void>): void;
declare function beforeEach(callback: () => void | Promise<void>): void;
declare function expect(actual: unknown): JestMatchers;

declare namespace expect {
  function arrayContaining(expected: unknown[]): unknown;
  function objectContaining(expected: Record<string, unknown>): unknown;
}

declare const jest: {
  fn<T extends (...args: never[]) => unknown>(): JestMock<T>;
  clearAllMocks(): void;
  doMock(moduleName: string, factory: () => unknown): void;
};



type Session = {
  user: {
    id: string;
    role: string;
  };
};

type KontenEdukasi = {
  idEdukasi: string;
  judul: string;
  kategori: string;
  isi: string;
  status: "DRAFT" | "PUBLISHED";
  mediaUrl: string | null;
  satgasId: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreateArgs = {
  data: Omit<KontenEdukasi, "idEdukasi" | "createdAt" | "updatedAt">;
};

type UpdateArgs = {
  where: { idEdukasi: string };
  data: Partial<
    Pick<KontenEdukasi, "judul" | "kategori" | "isi" | "status" | "mediaUrl">
  >;
};

const getServerSessionMock = jest.fn<() => Promise<Session | null>>();

const prismaMock = {
  kontenEdukasi: {
    create: jest.fn<(args: CreateArgs) => Promise<KontenEdukasi>>(),
    findUnique: jest.fn<
      (args: { where: { idEdukasi: string } }) => Promise<KontenEdukasi | null>
    >(),
    findMany: jest.fn<
      (args: {
        where?: { status?: "DRAFT" | "PUBLISHED" };
        orderBy?: { updatedAt: "desc" | "asc" };
      }) => Promise<KontenEdukasi[]>
    >(),
    update: jest.fn<(args: UpdateArgs) => Promise<KontenEdukasi>>(),
    delete: jest.fn<
      (args: { where: { idEdukasi: string } }) => Promise<KontenEdukasi>
    >(),
  },
};

jest.doMock("next-auth", () => ({
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

jest.doMock("@/app/generated/prisma/enums", () => ({
  StatusEdukasi: {
    DRAFT: "DRAFT",
    PUBLISHED: "PUBLISHED",
  },
}));

jest.doMock("@/app/generated/prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError
      extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));


type ManajemenEdukasiRoute =
  typeof import("@/app/api/satgas-ppks/manajemen-edukasi/route");

let route: ManajemenEdukasiRoute;

beforeAll(async () => {
  route = await import("@/app/api/satgas-ppks/manajemen-edukasi/route");
});


const createMock = prismaMock.kontenEdukasi.create;
const findUniqueMock = prismaMock.kontenEdukasi.findUnique;
const updateMock = prismaMock.kontenEdukasi.update;
const deleteMock = prismaMock.kontenEdukasi.delete;


// DATA DUMMY

const validData = {
  judul: "Pencegahan Kekerasan Seksual",
  kategori: "Pencegahan",
  isi: "Materi edukasi mengenai pencegahan kekerasan seksual.",
  status: "DRAFT" as const,
};

const dummyKonten = {
  idEdukasi: "edukasi-001",
  ...validData,
  mediaUrl: null,
  satgasId: "satgas-001",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createRequest(
  method: string,
  data?: Record<string, unknown>,
  url = "http://localhost:3000/api/manajemen-edukasi"
): NextRequest {
  return new NextRequest(url, {
    method,
    ...(data
      ? {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      : {}),
  });
}

async function readResponse(response: Response) {
  return response.json();
}


describe("WHITE BOX TESTING - US-18 MANAJEMEN KONTEN EDUKASI", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getServerSessionMock.mockResolvedValue({
      user: {
        id: "satgas-001",
        role: "SATGAS",
      },
    });

    createMock.mockResolvedValue(dummyKonten);
    findUniqueMock.mockResolvedValue(dummyKonten);
    updateMock.mockResolvedValue({
      ...dummyKonten,
      judul: "Mari Kita Kenali Pencegahan Kekerasan Seksual",
    });
    deleteMock.mockResolvedValue(dummyKonten);
  });


  it("TC-01 - Berhasil menambahkan konten edukasi baru", async () => {
    const request = createRequest("POST", validData);

    const response = await route.POST(request);
    const body = await readResponse(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe(
      "Materi edukasi berhasil ditambahkan."
    );

    expect(createMock).toHaveBeenCalledTimes(1);

    const savedData = createMock.mock.calls[0][0];

    expect(savedData.data.judul).toBe(validData.judul);
    expect(savedData.data.kategori).toBe(validData.kategori);
    expect(savedData.data.isi).toBe(validData.isi);
    expect(savedData.data.status).toBe("DRAFT");
    expect(savedData.data.satgasId).toBe("satgas-001");
  });

  
  it("TC-02 - Menolak konten jika judul kosong", async () => {
    const request = createRequest("POST", {
      ...validData,
      judul: "",
    });

    const response = await route.POST(request);
    const body = await readResponse(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);

    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "judul",
        }),
      ])
    );

    expect(createMock).not.toHaveBeenCalled();
  });

  
  it("TC-03 - Berhasil memperbarui konten edukasi", async () => {
    const updatedTitle =
      "Mari Kita Kenali Pencegahan Kekerasan Seksual";

    const request = createRequest("PUT", {
      idEdukasi: "edukasi-001",
      judul: updatedTitle,
    });

    const response = await route.PUT(request);
    const body = await readResponse(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe(
      "Materi edukasi berhasil diperbarui."
    );

    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);

    const updatedData = updateMock.mock.calls[0][0];

    expect(updatedData.where.idEdukasi).toBe("edukasi-001");
    expect(updatedData.data.judul).toBe(updatedTitle);
  });

  

  it("TC-04 - Berhasil menghapus konten edukasi", async () => {
    const request = createRequest(
      "DELETE",
      undefined,
      "http://localhost:3000/api/manajemen-edukasi?id=edukasi-001"
    );

    const response = await route.DELETE(request);
    const body = await readResponse(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe(
      "Materi edukasi berhasil dihapus."
    );

    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledTimes(1);

    expect(deleteMock).toHaveBeenCalledWith({
      where: {
        idEdukasi: "edukasi-001",
      },
    });
  });

  
  it("TC-05 - Berhasil mengambil detail konten edukasi", async () => {
    const request = createRequest(
      "GET",
      undefined,
      "http://localhost:3000/api/manajemen-edukasi?id=edukasi-001"
    );

    const response = await route.GET(request);
    const body = await readResponse(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        idEdukasi: "edukasi-001",
      },
    });

    expect(body.data.idEdukasi).toBe("edukasi-001");
    expect(body.data.judul).toBe(validData.judul);
    expect(body.data.kategori).toBe(validData.kategori);
    expect(body.data.isi).toBe(validData.isi);
  });
});