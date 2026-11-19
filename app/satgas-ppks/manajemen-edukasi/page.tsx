"use client";

import Link from "next/link";
import { getSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import SatgasFrame from "../components/SatgasFrame";
import EdukasiTable, { type EdukasiItem } from "./components/EdukasiTable";

export default function ManajemenEdukasiPage() {
  const [items, setItems] = useState<EdukasiItem[]>([]);
  const [satgasName, setSatgasName] = useState<string | null>(null);
  const [satgasInitials, setSatgasInitials] = useState<string | null>(null);
  const onDataChange = useCallback((data: EdukasiItem[]) => setItems(data), []);

  useEffect(() => {
    let active = true;

    getSession()
      .then((session) => {
        if (!active || !session?.user) return;

        const name = session.user.name?.trim();
        if (!name) return;

        const initials = name
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase();

        setSatgasName(name);
        setSatgasInitials(initials || "SP");
      })
      .catch((error: unknown) => {
        console.error("[MANAJEMEN_EDUKASI] Gagal mengambil session pengguna:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const publishedCount = items.filter((item) => item.status === "PUBLISHED").length;
  const draftCount = items.filter((item) => item.status === "DRAFT").length;

  return (
    <SatgasFrame
      satgas={satgasName && satgasInitials ? { name: satgasName, initials: satgasInitials } : null}
      jejak={[{ label: "Manajemen Edukasi" }]}
      judul="Manajemen Konten Edukasi"
    >
        <div>
          <section className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-[#193652] sm:text-[24px]">
                Manajemen Konten Edukasi
              </h1>
              <p className="mt-1.5 text-xs text-[#71839c]">
                Kelola materi edukasi yang ditampilkan kepada pengguna SAFE SPACE.
              </p>
            </div>
            <Link
              href="/satgas-ppks/manajemen-edukasi/tambah"
              className="inline-flex items-center gap-2 rounded-xl bg-[#107b73] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#0b6a63]"
            >
              <EditIcon />
              Tambah Materi
            </Link>
          </section>

          <section className="mb-5 flex gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3.5">
            <span className="mt-0.5 shrink-0 text-[#2563eb]">
              <InfoIcon />
            </span>
            <div>
              <h2 className="text-[11px] font-bold text-[#193652]">
                Status publikasi menentukan visibilitas materi
              </h2>
              <p className="mt-1 text-[10px] leading-4 text-[#71839c]">
                Materi berstatus Dipublikasikan tersedia pada halaman Edukasi pelapor. Materi Draft hanya tersimpan di halaman pengelolaan ini.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#dce4ea] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dce4ea] px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-[#193652]">Daftar Materi Edukasi</h2>
                <p className="mt-1 text-[10px] text-[#8798aa]">
                  Kelola materi terpublikasi dan draf internal.
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[#71839c]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                  <strong className="font-bold text-[#52677e]">{publishedCount}</strong> Dipublikasikan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#94a3b8]" />
                  <strong className="font-bold text-[#52677e]">{draftCount}</strong> Draft
                </span>
              </div>
            </div>

            <EdukasiTable onDataChange={onDataChange} />
          </section>
        </div>
    </SatgasFrame>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 5 3 3M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </svg>
  );
}