import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      !identifier.trim() ||
      !password
    ) {
      return NextResponse.json(
        { message: "Email dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const email = identifier.trim().toLowerCase();
    const pelapor = await prisma.pelapor.findUnique({
      where: { email },
    });

    const satgas = pelapor
      ? null
      : await prisma.satgasPPKS.findUnique({
          where: { email },
        });
    const user = pelapor ?? satgas;

    if (!user) {
      return NextResponse.json(
        { message: "Akun tidak ditemukan." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Kata sandi yang Anda masukkan salah." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message: "Login berhasil",
        role: pelapor ? "PELAPOR" : "SATGAS",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}