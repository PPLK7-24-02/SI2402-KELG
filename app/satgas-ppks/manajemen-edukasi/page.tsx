"use client";

import Link from "next/link";
import { getSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import {
  BarChart2,
  Bell,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Siren,
  Video,
  X,
} from "../components/icons";
import EdukasiTable, { type EdukasiItem } from "./components/EdukasiTable";

const NAV_ITEMS = [
  { href: "/satgas-ppks", label: "Dashboard", icon: LayoutDashboard },
  { href: "/satgas-ppks/daftar-laporan", label: "Manajemen Laporan", icon: FileText },
  { href: "/satgas-ppks/monitoring-cctv", label: "Monitoring CCTV", icon: Video },
  { href: "/satgas-ppks/pengelolaan-bukti", label: "Pengelolaan Bukti", icon: FolderOpen },
  { href: "/satgas-ppks/incident-alert", label: "Incident Alert AI", icon: Siren },
  { href: "/satgas-ppks/hasil-pemeriksaan", label: "Hasil Pemeriksaan", icon: ClipboardCheck },
  { href: "/satgas-ppks/riwayat-penanganan", label: "Riwayat Penanganan", icon: History },
  { href: "/satgas-ppks/statistik-kasus", label: "Statistik Kasus", icon: BarChart2 },
  { href: "/satgas-ppks/manajemen-edukasi", label: "Manajemen Edukasi", icon: BookOpen, active: true },
];

export default function ManajemenEdukasiPage() {
  const [items, setItems] = useState<EdukasiItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div
      className="flex min-h-screen bg-[#f5f8fb] text-[#193652]"
      style={{ fontFamily: "'Inter', 'Geist', Arial, sans-serif" }}
    >
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#0f2133] text-white transition-transform duration-300 ${
          sidebarOpen ? "flex translate-x-0" : "hidden -translate-x-full lg:flex lg:translate-x-0"
        } lg:relative lg:inset-auto lg:z-auto lg:flex lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-black tracking-wider">SAFE SPACE</p>
            <p className="text-[10px] text-white/50">Satgas PPKS</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup navigasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi Satgas PPKS">
          <p className="mb-2 px-2 text-[10px] font-bold tracking-[0.12em] text-white/40">
            MENU UTAMA
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    item.active
                      ? "bg-[#107b73] text-white shadow-lg shadow-[#107b73]/30"
                      : "text-white/60 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[#e5edf2] bg-white px-5 py-3 shadow-sm">
          <button
            className="rounded-lg p-2 text-[#193652] hover:bg-[#f0f4f8] lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka navigasi"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#71839c]" aria-label="Breadcrumb">
              <Link href="/satgas-ppks" className="hover:text-[#107b73]">SAFE SPACE</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#107b73]">MANAJEMEN EDUKASI</span>
            </nav>
            <p className="truncate text-base font-bold text-[#193652]">
              Manajemen Konten Edukasi
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative rounded-xl border border-[#e5edf2] bg-white p-2 text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73]"
            >
              <Bell className="h-5 w-5" />
            </button>
            {satgasName && satgasInitials && (
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-sm font-bold text-white">
                  {satgasInitials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-[#193652]">{satgasName}</p>
                  <p className="text-[11px] text-[#71839c]">Petugas Satgas PPKS</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-8 lg:px-9">
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
      </main>
    </div>
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