
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const pilihanJenisPengguna = [
  "MAHASISWA",
  "STAFF",
  "DOSEN",
] as const;

type JenisPenggunaInput =
  (typeof pilihanJenisPengguna)[number];

export async function POST(request: Request) {
  let input: unknown;

  // 1. Membaca data yang dikirim dari formulir.
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Format data tidak valid.",
      },
      { status: 400 }
    );
  }

  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Data registrasi tidak valid.",
      },
      { status: 400 }
    );
  }

  const body = input as Record<string, unknown>;

  // 2. Mengambil data dengan memeriksa tipe masing-masing.
  const nama =
    typeof body.nama === "string"
      ? body.nama.trim()
      : "";

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  const jenisPengguna =
    typeof body.jenisPengguna === "string"
      ? body.jenisPengguna
      : "";

  const nimNip =
    typeof body.nimNip === "string"
      ? body.nimNip.trim()
      : "";

  const noHp =
    typeof body.noHp === "string"
      ? body.noHp.trim()
      : "";

  // 3. Memastikan seluruh kolom wajib diisi.
  if (
    !nama ||
    !email ||
    !password ||
    !jenisPengguna ||
    !nimNip ||
    !noHp
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Semua kolom wajib diisi.",
      },
      { status: 400 }
    );
  }

  // 4. Memvalidasi nama dan email.
  if (nama.length < 2 || nama.length > 150) {
    return NextResponse.json(
      {
        success: false,
        message: "Nama harus terdiri dari 2–150 karakter.",
      },
      { status: 400 }
    );
  }

  if (
    email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Format email tidak valid.",
      },
      { status: 400 }
    );
  }

  // 5. Memvalidasi password untuk bcrypt.
  if (
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Password minimal 8 karakter dan maksimal 72 byte.",
      },
      { status: 400 }
    );
  }

  // 6. Hanya menerima jenis pengguna yang diizinkan.
  if (
    !pilihanJenisPengguna.includes(
      jenisPengguna as JenisPenggunaInput
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Jenis pengguna tidak valid.",
      },
      { status: 400 }
    );
  }

  // 7. Memvalidasi NIM/NIP dan nomor HP.
  if (nimNip.length > 50) {
    return NextResponse.json(
      {
        success: false,
        message: "NIM/NIP maksimal 50 karakter.",
      },
      { status: 400 }
    );
  }

  if (
    noHp.length < 8 ||
    noHp.length > 20 ||
    !/^[0-9+\s().-]+$/.test(noHp)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Nomor HP tidak valid.",
      },
      { status: 400 }
    );
  }

  try {
    // 8. Memastikan email belum digunakan pelapor lain
    // maupun akun Satgas yang telah dibuat secara terpisah.
    const [pelaporLama, satgasLama] = await Promise.all([
      prisma.pelapor.findUnique({
        where: { email },
        select: { idPelapor: true },
      }),

      prisma.satgasPPKS.findUnique({
        where: { email },
        select: { idSatgasPPKS: true },
      }),
    ]);

    if (pelaporLama || satgasLama) {
      return NextResponse.json(
        {
          success: false,
          message: "Email tersebut sudah terdaftar.",
        },
        { status: 409 }
      );
    }

    // 9. Mengubah password menjadi hash sebelum disimpan.
    const passwordHash = await bcrypt.hash(password, 12);

    // 10. Menyimpan akun baru melalui Prisma ke MySQL.
    // Role Satgas tidak dapat dibuat melalui endpoint publik ini.
    const pelapor = await prisma.pelapor.create({
      data: {
        nama,
        email,
        passwordHash,
        jenisPengguna:
          jenisPengguna as JenisPenggunaInput,
        nimNip,
        noHp,
      },

      // PasswordHash sengaja tidak dikembalikan ke browser.
      select: {
        idPelapor: true,
        nama: true,
        email: true,
        jenisPengguna: true,
        nimNip: true,
        noHp: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Registrasi berhasil. Silakan login menggunakan akunmu.",
        data: pelapor,
      },
      { status: 201 }
    );
  } catch (error) {
    // Menangani email duplikat jika ada request bersamaan.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Email tersebut sudah terdaftar.",
        },
        { status: 409 }
      );
    }

    console.error("Kesalahan API registrasi:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Registrasi gagal karena masalah server.",
      },
      { status: 500 }
    );
  }
}
