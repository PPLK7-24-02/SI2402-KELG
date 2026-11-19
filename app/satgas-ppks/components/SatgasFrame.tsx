"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { Bell, ChevronRight, Menu } from "./icons";
import { useSatgasShell } from "./SatgasShell";
import type { SatgasSidebarInfo } from "./SidebarSatgas";

export type JejakHalaman = { label: string; href?: string };

// Header + area isi tiap halaman Satgas PPKS. Sidebar-nya ada di SatgasShell
// (app/satgas-ppks/layout.tsx) supaya tidak ikut dimuat ulang saat pindah halaman.
export default function SatgasFrame({
  satgas,
  jejak,
  judul,
  indikatorNotif,
  aksiHeader,
  children,
}: {
  /** null = data petugas masih dimuat (tampil placeholder). */
  satgas: SatgasSidebarInfo | null;
  /** Breadcrumb setelah "SAFE SPACE". Item terakhir = halaman saat ini. */
  jejak: JejakHalaman[];
  judul: string;
  /** Angka = badge jumlah, true = titik merah. */
  indikatorNotif?: number | boolean;
  /** Elemen tambahan di kanan header, sebelum lonceng. */
  aksiHeader?: ReactNode;
  children: ReactNode;
}) {
  const shell = useSatgasShell();
  // Selama data halaman belum siap, pakai info petugas dari layout agar header tidak berkedip.
  const petugas = satgas ?? shell?.satgas ?? null;

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[#e5edf2] bg-white px-5 py-3 shadow-sm">
        <button
          type="button"
          className="rounded-lg p-2 text-[#193652] hover:bg-[#f0f4f8] lg:hidden"
          onClick={() => shell?.openSidebar()}
          aria-label="Buka navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <nav
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#71839c]"
            aria-label="Breadcrumb"
          >
            <Link href="/satgas-ppks" className="hover:text-[#107b73]">
              SAFE SPACE
            </Link>
            {jejak.map((item, i) => (
              <Fragment key={`${item.label}-${i}`}>
                <ChevronRight className="h-3 w-3 shrink-0" />
                {item.href && i < jejak.length - 1 ? (
                  <Link href={item.href} className="hover:text-[#107b73]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="truncate text-[#107b73]">{item.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
          <p className="truncate text-base font-bold text-[#193652]">{judul}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {aksiHeader}

          <button
            type="button"
            aria-label="Notifikasi"
            className="relative rounded-xl border border-[#e5edf2] bg-white p-2 text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73]"
          >
            <Bell className="h-5 w-5" />
            {typeof indikatorNotif === "number" && indikatorNotif > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {indikatorNotif}
              </span>
            )}
            {indikatorNotif === true && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
            )}
          </button>

          {petugas ? (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-sm font-bold text-white">
                {petugas.initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#193652]">{petugas.name}</p>
                <p className="text-[11px] text-[#71839c]">Petugas Satgas PPKS</p>
              </div>
            </div>
          ) : (
            // Placeholder seukuran avatar agar header tidak bergeser saat nama selesai dimuat.
            <div className="flex items-center gap-2" aria-hidden="true">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-[#e5edf2]" />
              <div className="hidden space-y-1.5 sm:block">
                <div className="h-3 w-24 animate-pulse rounded bg-[#e5edf2]" />
                <div className="h-2.5 w-28 animate-pulse rounded bg-[#eef3f7]" />
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 px-5 py-6 sm:px-8 lg:px-10">{children}</div>
    </main>
  );
}
