import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getReportUploadDirectory } from "@/lib/report-files";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ idBukti: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Silakan masuk untuk mengakses lampiran." },
      { status: 401 }
    );
  }

  const { idBukti } = await context.params;
  const evidence = await prisma.buktiLaporan.findUnique({
    where: { idBukti },
    select: {
      namaFile: true,
      tipeFile: true,
      fileUrl: true,
      laporan: { select: { pelaporId: true } },
    },
  });

  if (!evidence) {
    return NextResponse.json(
      { success: false, message: "Lampiran tidak ditemukan." },
      { status: 404 }
    );
  }

  const isOwner =
    session.user.role === "PELAPOR" &&
    session.user.id === evidence.laporan.pelaporId;
  const isSatgas = session.user.role === "SATGAS";

  if (!isOwner && !isSatgas) {
    return NextResponse.json(
      { success: false, message: "Anda tidak memiliki akses ke lampiran ini." },
      { status: 403 }
    );
  }

  const storedName = evidence.fileUrl.startsWith("private://")
    ? evidence.fileUrl.slice("private://".length)
    : "";

  if (!/^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(storedName)) {
    return NextResponse.json(
      { success: false, message: "Lampiran tidak ditemukan." },
      { status: 404 }
    );
  }

  try {
    const contents = await readFile(
      path.join(getReportUploadDirectory(), storedName)
    );
    const safeName = encodeURIComponent(evidence.namaFile.replace(/[\r\n]/g, "_"));

    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": evidence.tipeFile,
        "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Read report attachment error:", error);
    return NextResponse.json(
      { success: false, message: "Lampiran tidak dapat diakses." },
      { status: 404 }
    );
  }
}