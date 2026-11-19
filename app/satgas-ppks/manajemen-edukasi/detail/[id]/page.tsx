"use client";

import Image from "next/image";
import Link from "next/link";
import { getSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  ChevronRight,
} from "../../../components/icons";
import SatgasFrame from "../../../components/SatgasFrame";
import EdukasiStatusBadge from "../../components/EdukasiStatusBadge";

type MateriEdukasi = {
  idEdukasi: string;
  judul: string;
  kategori: string;
  isi: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  mediaUrl: string | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: MateriEdukasi;
};

function formatTanggal(value: string) {
  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(tanggal);
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e5edf2] bg-[#fbfdff] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8798aa]">{label}</p>
      <div className="mt-2 text-sm font-medium leading-6 text-[#193652]">{children}</div>
    </div>
  );
}

export default function DetailMateriPage() {
  const { id } = useParams<{ id: string }>();
  const [loadState, setLoadState] = useState<{
    id: string;
    materi?: MateriEdukasi;
    error?: string;
  } | null>(null);
  const [satgasName, setSatgasName] = useState<string | null>(null);
  const [satgasInitials, setSatgasInitials] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getSession()
      .then((session) => {
        if (!active || !session?.user) return;

        const name = session.user.name?.trim();
        if (!name) return;

        setSatgasName(name);
        setSatgasInitials(
          name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase() || "SP"
        );
      })
      .catch((sessionError: unknown) => {
        console.error("[DETAIL_MATERI_EDUKASI] Gagal mengambil session pengguna:", sessionError);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/satgas-ppks/manajemen-edukasi?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: ApiResponse = await response.json();
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Detail materi edukasi gagal dimuat.");
        }
        if (result.data.idEdukasi !== id) {
          throw new Error("Data materi yang diterima tidak sesuai dengan ID yang diminta.");
        }
        setLoadState({ id, materi: result.data });
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          id,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Terjadi kesalahan saat mengambil detail materi edukasi.",
        });
      });

    return () => controller.abort();
  }, [id]);

  const loading = loadState?.id !== id;
  const materi = loadState?.id === id ? loadState.materi ?? null : null;
  const error = loadState?.id === id ? loadState.error ?? "" : "";
  const mediaUrl = materi?.mediaUrl ?? null;
  const mediaFileName = mediaUrl
    ? ((mediaUrl.split(/[?#]/, 1)[0] ?? "").split("/").pop() ?? "")
    : "";
  const mediaExtension = mediaFileName.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png"].includes(mediaExtension);
  const isPdf = mediaExtension === "pdf";
  const isWordDocument = ["doc", "docx"].includes(mediaExtension);

  return (
    <SatgasFrame
      satgas={satgasName && satgasInitials ? { name: satgasName, initials: satgasInitials } : null}
      jejak={[{ label: "Manajemen Edukasi", href: "/satgas-ppks/manajemen-edukasi" }, { label: "Detail Materi" }]}
      judul="Detail Materi Edukasi"
    >
        <div>
          <section className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-[#193652] sm:text-[24px]">
                Detail Materi Edukasi
              </h1>
              <p className="mt-1.5 text-xs text-[#71839c]">
                Lihat informasi lengkap materi edukasi.
              </p>
            </div>
            <Link
              href="/satgas-ppks/manajemen-edukasi"
              className="inline-flex items-center gap-2 rounded-xl border border-[#dce4ea] bg-white px-4 py-3 text-xs font-bold text-[#52677e] shadow-sm transition hover:border-[#107b73] hover:text-[#107b73]"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Kembali
            </Link>
          </section>

          {loading && (
            <section
              className="rounded-xl border border-[#dce4ea] bg-white px-5 py-16 text-center text-sm text-[#71839c] shadow-sm"
              role="status"
            >
              Memuat detail materi edukasi...
            </section>
          )}

          {!loading && error && (
            <section
              className="rounded-xl border border-red-200 bg-white px-5 py-12 text-center shadow-sm"
              role="alert"
            >
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <Link
                href="/satgas-ppks/manajemen-edukasi"
                className="mt-4 inline-flex rounded-lg bg-[#107b73] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b6a63]"
              >
                Kembali ke Manajemen Edukasi
              </Link>
            </section>
          )}

          {!loading && !error && materi && (
            <div className="space-y-5">
              <section className="overflow-hidden rounded-xl border border-[#dce4ea] bg-white shadow-sm">
                <div className="border-b border-[#e5edf2] px-5 py-4 sm:px-6">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#107b73]">
                    Informasi Materi
                  </p>
                  <h2 className="mt-1.5 break-words text-lg font-bold leading-7 text-[#193652]">
                    {materi.judul}
                  </h2>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                  <DetailField label="Kategori">{materi.kategori}</DetailField>
                  <DetailField label="Status Publikasi">
                    <EdukasiStatusBadge status={materi.status} />
                  </DetailField>
                  <DetailField label="Tanggal Dibuat">{formatTanggal(materi.createdAt)}</DetailField>
                  <DetailField label="Tanggal Diperbarui">{formatTanggal(materi.updatedAt)}</DetailField>
                </div>
                <div className="border-t border-[#e5edf2] px-5 py-5 sm:px-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#8798aa]">
                    Isi Materi
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#52677e]">
                    {materi.isi}
                  </p>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#dce4ea] bg-white shadow-sm">
                <div className="border-b border-[#e5edf2] px-5 py-4 sm:px-6">
                  <h2 className="text-sm font-bold text-[#193652]">Media Pendukung</h2>
                  <p className="mt-1 text-[10px] text-[#8798aa]">
                    File yang dilampirkan pada materi edukasi ini.
                  </p>
                </div>

                {!mediaUrl && (
                  <p className="px-5 py-8 text-sm text-[#71839c] sm:px-6">
                    Materi ini tidak memiliki media pendukung.
                  </p>
                )}

                {mediaUrl && isImage && (
                  <div className="p-5 sm:p-6">
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Buka gambar ${mediaFileName} dalam ukuran penuh`}
                      className="block overflow-hidden rounded-lg border border-[#e5edf2] bg-[#f5f8fb] p-3"
                    >
                      <Image
                        src={mediaUrl}
                        alt={`Media pendukung: ${mediaFileName}`}
                        width={1200}
                        height={800}
                        unoptimized
                        className="mx-auto max-h-[34rem] w-full object-contain"
                      />
                    </a>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="break-all text-xs font-medium text-[#52677e]">{mediaFileName}</p>
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#107b73] hover:text-[#075e57]"
                      >
                        Buka gambar ukuran penuh
                      </a>
                    </div>
                  </div>
                )}

                {mediaUrl && isPdf && (
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5edf2] bg-[#fbfdff] p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fef2f2] text-xs font-bold text-[#dc2626]">
                          PDF
                        </span>
                        <div className="min-w-0">
                          <p className="break-all text-xs font-semibold text-[#193652]">
                            {mediaFileName}
                          </p>
                          <p className="mt-1 text-[10px] text-[#71839c]">Dokumen PDF</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-[#dce4ea] bg-white px-3 py-2 text-[11px] font-semibold text-[#52677e] hover:border-[#107b73] hover:text-[#107b73]"
                        >
                          Buka PDF
                        </a>
                        <a
                          href={mediaUrl}
                          download={mediaFileName}
                          className="rounded-lg bg-[#107b73] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#0b6a63]"
                        >
                          Unduh PDF
                        </a>
                      </div>
                    </div>
                    <iframe
                      src={mediaUrl}
                      title={`Pratinjau PDF ${mediaFileName}`}
                      className="mt-4 h-[32rem] w-full rounded-lg border border-[#e5edf2] bg-[#f5f8fb]"
                    />
                  </div>
                )}

                {mediaUrl && isWordDocument && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-xs font-bold text-[#2563eb]">
                        DOC
                      </span>
                      <div className="min-w-0">
                        <p className="break-all text-xs font-semibold text-[#193652]">
                          {mediaFileName}
                        </p>
                        <p className="mt-1 text-[10px] text-[#71839c]">
                          Dokumen Microsoft Word · {mediaExtension.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <a
                      href={mediaUrl}
                      download={mediaFileName}
                      className="rounded-lg bg-[#107b73] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#0b6a63]"
                    >
                      Unduh Dokumen
                    </a>
                  </div>
                )}

                {mediaUrl && !isImage && !isPdf && !isWordDocument && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
                    <p className="break-all text-xs font-semibold text-[#193652]">
                      {mediaFileName}
                    </p>
                    <a
                      href={mediaUrl}
                      download={mediaFileName}
                      className="rounded-lg bg-[#107b73] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#0b6a63]"
                    >
                      Unduh Media
                    </a>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
    </SatgasFrame>
  );
}