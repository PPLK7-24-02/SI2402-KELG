import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function isDuplicateEmailError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  const registrationSecret = process.env.SATGAS_REGISTRATION_SECRET;

  if (!registrationSecret) {
    console.error("SATGAS_REGISTRATION_SECRET belum dikonfigurasi.");
    return NextResponse.json(
      { success: false, message: "Endpoint registrasi belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const providedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expectedBuffer = Buffer.from(registrationSecret);
  const providedBuffer = Buffer.from(providedSecret);
  const authorized =
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer);

  if (!authorized) {
    return NextResponse.json(
      { success: false, message: "Tidak memiliki akses." },
      { status: 401 }
    );
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Format data tidak valid." },
      { status: 400 }
    );
  }

  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return NextResponse.json(
      { success: false, message: "Data registrasi tidak valid." },
      { status: 400 }
    );
  }

  const body = input as Record<string, unknown>;
  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  const password =
    typeof body.password === "string" ? body.password : "";
  const noHp = typeof body.noHp === "string" ? body.noHp.trim() : "";

  if (!nama || !email || !password || !noHp) {
    return NextResponse.json(
      { success: false, message: "Semua kolom wajib diisi." },
      { status: 400 }
    );
  }

  if (nama.length < 2 || nama.length > 150) {
    return NextResponse.json(
      { success: false, message: "Nama harus terdiri dari 2–150 karakter." },
      { status: 400 }
    );
  }

  if (
    email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      { success: false, message: "Format email tidak valid." },
      { status: 400 }
    );
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Password minimal 8 karakter dan maksimal 72 byte.",
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
      { success: false, message: "Nomor HP tidak valid." },
      { status: 400 }
    );
  }

  try {
    const [existingPelapor, existingSatgas] = await Promise.all([
      prisma.pelapor.findUnique({
        where: { email },
        select: { idPelapor: true },
      }),
      prisma.satgasPPKS.findUnique({
        where: { email },
        select: { idSatgasPPKS: true },
      }),
    ]);

    if (existingPelapor || existingSatgas) {
      return NextResponse.json(
        { success: false, message: "Email tersebut sudah terdaftar." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const satgas = await prisma.satgasPPKS.create({
      data: { nama, email, passwordHash, noHp },
      select: {
        idSatgasPPKS: true,
        nama: true,
        email: true,
        noHp: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Akun Satgas berhasil dibuat.",
        data: satgas,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return NextResponse.json(
        { success: false, message: "Email tersebut sudah terdaftar." },
        { status: 409 }
      );
    }

    console.error("Kesalahan API registrasi Satgas:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
