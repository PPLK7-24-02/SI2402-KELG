"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import type { LaporanPelaporTracking } from "./page";

// ── Icons SVG Self-contained ──────────────────────────────────────────
function IconShieldCheck({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconLayoutDashboard({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function IconEditFile({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function IconAlertTriangle({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IconSearch({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconBookOpen({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconBell({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconClock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCheck({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconInfo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function IconChevronRight({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconMenu({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function IconX({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconFileText({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M10 13H8M16 17H8M16 13H8" />
    </svg>
  );
}

function IconCalendar({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

// ── Types & Helpers ───────────────────────────────────────────────────
interface CaseTrackingClientProps {
  reports: LaporanPelaporTracking[];
  user: {
    name: string;
    email: string;
    jenisPengguna: string;
    initials: string;
  };
}

function formatDetailTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " WIB";
  } catch {
    return isoString;
  }
}

// ── Status Configurations ─────────────────────────────────────────────
const STATUS_STYLES: Record<
  string,
  { label: string; bg: string; text: string; border: string; iconType: "clock" | "check" | "alert" }
> = {
  DITERIMA: {
    label: "Diterima",
    bg: "bg-[#eff6ff]",
    text: "text-[#2563eb]",
    border: "border-[#bfdbfe]",
    iconType: "clock",
  },
  REVIEW: {
    label: "Dalam Review",
    bg: "bg-[#fffbeb]",
    text: "text-[#d97706]",
    border: "border-[#fde68a]",
    iconType: "clock",
  },
  DIVERIFIKASI: {
    label: "Diverifikasi",
    bg: "bg-[#f5f3ff]",
    text: "text-[#7c3aed]",
    border: "border-[#ddd6fe]",
    iconType: "check",
  },
  DITANGANI: {
    label: "Ditangani",
    bg: "bg-[#fffbeb]",
    text: "text-[#d97706]",
    border: "border-[#fde68a]",
    iconType: "clock",
  },
  SELESAI: {
    label: "Selesai",
    bg: "bg-[#f0fdf4]",
    text: "text-[#16a34a]",
    border: "border-[#bbf7d0]",
    iconType: "check",
  },
  TIDAK_VALID: {
    label: "Tidak Valid",
    bg: "bg-[#fef2f2]",
    text: "text-[#dc2626]",
    border: "border-[#fecaca]",
    iconType: "alert",
  },
};

export default function CaseTrackingClient({ reports, user }: CaseTrackingClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string>(
    reports.length > 0 ? reports[0].idLaporan : ""
  );

  // Filter laporan berdasarkan pencarian nomor kasus atau kategori
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.nomorKasus.toLowerCase().includes(q) ||
        r.kategori.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  // Laporan yang saat ini aktif dipilih
  const activeReport = useMemo(() => {
    const found = reports.find((r) => r.idLaporan === selectedReportId);
    return found || reports[0] || null;
  }, [reports, selectedReportId]);

  // Logika tahapan alur penanganan (5 tahap sesuai mockup)
  // 1. Laporan Diajukan
  // 2. Laporan Diverifikasi
  // 3. Penanganan Berlangsung
  // 4. Investigasi
  // 5. Selesai
  const timelineSteps = useMemo(() => {
    if (!activeReport) return [];

    const st = activeReport.status;
    const rw = activeReport.riwayat || [];

    // Cari riwayat tanggal untuk masing-masing tahap jika ada
    const diajukanRw = rw.find((r) => r.statusBaru === "DITERIMA") || rw[0];
    const diverifikasiRw = rw.find((r) => r.statusBaru === "DIVERIFIKASI");
    const ditanganiRw = rw.find((r) => r.statusBaru === "DITANGANI");
    const selesaiRw = rw.find((r) => r.statusBaru === "SELESAI");

    // Tentukan status untuk masing-masing tahap: "selesai" | "aktif" | "menunggu"
    let s1Status: "selesai" | "aktif" | "menunggu" = "selesai";
    let s2Status: "selesai" | "aktif" | "menunggu" = "menunggu";
    let s3Status: "selesai" | "aktif" | "menunggu" = "menunggu";
    let s4Status: "selesai" | "aktif" | "menunggu" = "menunggu";
    let s5Status: "selesai" | "aktif" | "menunggu" = "menunggu";

    if (st === "DITERIMA") {
      s1Status = "aktif";
      s2Status = "menunggu";
      s3Status = "menunggu";
      s4Status = "menunggu";
      s5Status = "menunggu";
    } else if (st === "DIVERIFIKASI") {
      s1Status = "selesai";
      s2Status = "aktif";
      s3Status = "menunggu";
      s4Status = "menunggu";
      s5Status = "menunggu";
    } else if (st === "DITANGANI") {
      s1Status = "selesai";
      s2Status = "selesai";
      s3Status = "aktif";
      s4Status = "menunggu";
      s5Status = "menunggu";
    } else if (st === "SELESAI") {
      s1Status = "selesai";
      s2Status = "selesai";
      s3Status = "selesai";
      s4Status = "selesai";
      s5Status = "selesai";
    }

    return [
      {
        id: "step-1",
        label: "Laporan Diajukan",
        description: "Laporan berhasil diterima oleh sistem SAFE SPACE.",
        time: diajukanRw ? formatDetailTime(diajukanRw.createdAt) : formatDetailTime(activeReport.tanggalLaporan),
        state: s1Status,
      },
      {
        id: "step-2",
        label: "Laporan Diverifikasi",
        description: "Informasi awal laporan telah diperiksa oleh petugas.",
        time: diverifikasiRw ? formatDetailTime(diverifikasiRw.createdAt) : s2Status === "menunggu" ? "Menunggu verifikasi" : formatDetailTime(activeReport.updatedAt),
        state: s2Status,
      },
      {
        id: "step-3",
        label: "Penanganan Berlangsung",
        description: "Laporan sedang ditangani sesuai alur Satgas PPKS.",
        time: ditanganiRw ? formatDetailTime(ditanganiRw.createdAt) : s3Status === "menunggu" ? "Menunggu penanganan" : formatDetailTime(activeReport.updatedAt),
        state: s3Status,
      },
      {
        id: "step-4",
        label: "Investigasi",
        description: "Tahap ini akan diperbarui bila berlaku untuk laporan Anda.",
        time: s4Status === "selesai" ? formatDetailTime(activeReport.updatedAt) : "Menunggu perkembangan",
        state: s4Status,
      },
      {
        id: "step-5",
        label: "Selesai",
        description: "Status akhir akan ditampilkan setelah proses penanganan selesai.",
        time: selesaiRw ? formatDetailTime(selesaiRw.createdAt) : s5Status === "selesai" ? formatDetailTime(activeReport.updatedAt) : "Belum tersedia",
        state: s5Status,
      },
    ];
  }, [activeReport]);

  const activeStatusCfg = activeReport
    ? STATUS_STYLES[activeReport.status] || {
        label: activeReport.status,
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
        iconType: "clock",
      }
    : null;

  return (
    <div className="flex min-h-screen bg-[#f5f8fb] text-[#193652]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Mobile Sidebar Backdrop ──────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (Kiri) ──────────────────────────────────── */}
      <aside
        id="pelapor-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-col bg-[#0f2133] text-white transition-transform duration-300 ${
          sidebarOpen ? "flex translate-x-0" : "hidden -translate-x-full lg:flex lg:translate-x-0"
        } lg:relative lg:inset-auto lg:z-auto lg:flex lg:translate-x-0`}
      >
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-white">
            <IconShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-black tracking-wider text-white">SAFE SPACE</p>
            <p className="text-[10px] text-white/50">Portal Pelapor</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <IconX className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {/* Menu Navigasi Pelapor */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi Pelapor">
          <p className="mb-2 px-2 text-[10px] font-bold tracking-[0.12em] text-white/40">
            MENU PELAPOR
          </p>
          <ul className="space-y-1">
            {/* Dashboard */}
            <li>
              <Link
                href="/pelapor"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/8 hover:text-white"
              >
                <IconLayoutDashboard className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">Dashboard</span>
              </Link>
            </li>

            {/* Buat Laporan */}
            <li>
              <Link
                href="/pelapor/buat-laporan"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/8 hover:text-white"
              >
                <IconEditFile className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">Buat Laporan</span>
              </Link>
            </li>

            {/* Emergency Report */}
            <li>
              <Link
                href="/pelapor/emergency-report"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/8 hover:text-white"
              >
                <IconAlertTriangle className="h-[18px] w-[18px] shrink-0 text-rose-400" />
                <span className="flex-1">Emergency Report</span>
              </Link>
            </li>

            {/* Case Tracking (ACTIVE) */}
            <li>
              <Link
                href="/pelapor/case-tracking"
                aria-current="page"
                className="flex items-center gap-3 rounded-xl bg-[#107b73] px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#107b73]/30 transition"
              >
                <IconSearch className="h-[18px] w-[18px] shrink-0 text-white" />
                <span className="flex-1">Case Tracking</span>
                <IconChevronRight className="h-4 w-4 opacity-70" />
              </Link>
            </li>

            {/* Edukasi */}
            <li>
              <Link
                href="/edukasi"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/8 hover:text-white"
              >
                <IconBookOpen className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">Edukasi</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Bottom Section Sidebar */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.06] p-3">
            <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#80ddd2]" />
            <div>
              <p className="text-[11px] font-semibold text-white">Akses laporan pribadi</p>
              <p className="mt-0.5 text-[10px] leading-4 text-white/50">
                Hanya laporan yang terkait dengan akun Anda yang ditampilkan.
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-white/30">
            SAFE SPACE · Portal Pelapor
          </p>
        </div>
      </aside>

      {/* ── Main Area (Kanan) ────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e5edf2] bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu navigasi"
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400">
                SAFE SPACE &gt; CASE TRACKING
              </p>
              <p className="text-sm font-bold text-[#193652]">Lacak Status Laporan</p>
            </div>
          </div>

          {/* User profile & Notification */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Notifikasi"
            >
              <IconBell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>

            <span className="h-5 border-l border-slate-200" />

            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcf2ee] text-xs font-bold text-[#0d8277]">
                {user.initials}
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[#193652] leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 capitalize leading-tight">{user.jenisPengguna.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Judul & Deskripsi Section */}
          <div className="mb-5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#107b73]">
              PERKEMBANGAN LAPORAN
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#193652] sm:text-[26px]">
              Lacak Status Laporan
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Pantau status dan perkembangan laporan yang Anda kirim melalui SAFE SPACE.
            </p>
          </div>

          {/* Alert Banner Hijau (Info Perlindungan Informasi Internal & Privasi) */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#bde5df] bg-[#e9f6f4] px-4 py-3 text-xs leading-5 text-[#24635e]">
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-[#107b73]" />
            <p>
              Informasi yang ditampilkan terbatas pada perkembangan yang dapat diakses pelapor. Catatan internal, identitas terbatas, dan bukti rahasia tidak ditampilkan.
            </p>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] items-start">
            {/* ── Kolom Kiri: Laporan Saya ──────────────────────── */}
            <section className="rounded-2xl border border-[#e5edf2] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#193652]">Laporan Saya</h2>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e9f6f4] text-[10px] font-bold text-[#107b73]">
                      {reports.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Pilih laporan untuk melihat perkembangannya.
                  </p>
                </div>
              </div>

              {/* Input Pencarian */}
              <div className="relative mb-4">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor kasus atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#107b73] focus:ring-1 focus:ring-[#107b73]"
                />
              </div>

              {/* Daftar Card Laporan */}
              <div className="space-y-3">
                {filteredReports.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada laporan ditemukan
                  </div>
                ) : (
                  filteredReports.map((item) => {
                    const isSelected = activeReport?.idLaporan === item.idLaporan;
                    const stCfg = STATUS_STYLES[item.status] || {
                      label: item.status,
                      bg: "bg-slate-100",
                      text: "text-slate-700",
                      border: "border-slate-200",
                    };

                    return (
                      <div
                        key={item.idLaporan}
                        onClick={() => setSelectedReportId(item.idLaporan)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all ${
                          isSelected
                            ? "border-[#107b73] bg-white ring-2 ring-[#107b73]/20 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        {/* Header card: Nomor kasus + Status badge */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[#193652]">{item.nomorKasus}</p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${stCfg.bg} ${stCfg.text} ${stCfg.border}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {stCfg.label}
                          </span>
                        </div>

                        {/* Metadata: Kategori & Tanggal */}
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <IconFileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.kategori}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <IconCalendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{item.waktuLaporanFormatted}</span>
                          </div>
                        </div>

                        {/* Action Button: Lihat Perkembangan */}
                        <div className="mt-4">
                          <button
                            type="button"
                            className={`w-full rounded-lg py-2 px-3 text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? "bg-[#0f2133] text-white hover:bg-[#1a3654]"
                                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span>Lihat Perkembangan</span>
                            <IconChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ── Kolom Kanan: Detail Laporan Terpilih ─────────── */}
            {activeReport ? (
              <div className="space-y-5">
                {/* 1. Ringkasan Laporan Card */}
                <section className="rounded-2xl border border-[#e5edf2] bg-white p-5 sm:p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#107b73]">
                        LAPORAN TERPILIH
                      </p>
                      <h2 className="text-base font-bold text-[#193652]">Ringkasan Laporan</h2>
                    </div>
                    {activeStatusCfg && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${activeStatusCfg.bg} ${activeStatusCfg.text} ${activeStatusCfg.border}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {activeStatusCfg.label}
                      </span>
                    )}
                  </div>

                  {/* 4 Kolom Grid Ringkasan Sesuai Mockup */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                    <div>
                      <p className="text-[11px] text-slate-400">Nomor kasus</p>
                      <p className="mt-1 font-bold text-[#193652]">{activeReport.nomorKasus}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">Kategori laporan</p>
                      <p className="mt-1 font-semibold text-[#193652]">{activeReport.kategori}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">Tanggal laporan</p>
                      <p className="mt-1 font-semibold text-[#193652]">{activeReport.waktuLaporanFormatted}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">Status terkini</p>
                      <div className="mt-1 flex items-center gap-1 font-semibold text-[#193652]">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span>{activeStatusCfg?.label || activeReport.status}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Banner TAHAP SAAT INI (Hijau Muda) Sesuai Mockup */}
                <section className="flex items-start gap-3 rounded-2xl border border-[#bde5df] bg-[#e7f5f3] p-4 text-[#193652]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#107b73] text-white">
                    <IconClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#107b73]">
                      TAHAP SAAT INI
                    </p>
                    <p className="mt-0.5 text-base font-bold text-[#193652]">
                      {activeStatusCfg?.label || activeReport.status}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                      {activeReport.status === "SELESAI"
                        ? "Seluruh proses penanganan laporan telah diselesaikan oleh Satgas PPKS."
                        : activeReport.status === "DITANGANI"
                        ? "Laporan telah diverifikasi dan sedang berada pada tahap penanganan oleh petugas Satgas PPKS."
                        : activeReport.status === "DIVERIFIKASI"
                        ? "Laporan telah diverifikasi oleh tim Satgas PPKS dan segera ditindaklanjuti."
                        : "Laporan telah diterima dalam sistem dan sedang dalam antrean review oleh Satgas PPKS."}
                    </p>
                  </div>
                </section>

                {/* 3. Timeline Perkembangan Penanganan (Vertical Stepper 5 Tahap) */}
                <section className="rounded-2xl border border-[#e5edf2] bg-white p-5 sm:p-6 shadow-sm">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-[#193652]">
                        Perkembangan Penanganan
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Tahap yang telah selesai, sedang berjalan, dan masih menunggu.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                      Diperbarui secara bertahap
                    </span>
                  </div>

                  {/* Stepper Vertikal */}
                  <div className="relative pl-2 sm:pl-4">
                    {timelineSteps.map((step, index) => {
                      const isLast = index === timelineSteps.length - 1;

                      return (
                        <div key={step.id} className="relative flex items-start gap-4 pb-7 last:pb-0">
                          {/* Garis penghubung vertikal */}
                          {!isLast && (
                            <span
                              className={`absolute left-[15px] top-[30px] -bottom-[2px] w-[2px] ${
                                step.state === "selesai" ? "bg-[#107b73]" : "bg-slate-200"
                              }`}
                              aria-hidden="true"
                            />
                          )}

                          {/* Node Bulatan Icon Stepper */}
                          <div className="relative z-10 shrink-0">
                            {step.state === "selesai" ? (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#107b73] text-white shadow-sm">
                                <IconCheck className="h-4 w-4" />
                              </span>
                            ) : step.state === "aktif" ? (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#107b73] bg-[#e7f5f3] text-[#107b73] shadow-sm">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#107b73] animate-pulse" />
                              </span>
                            ) : (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300">
                                <span className="h-2 w-2 rounded-full bg-slate-200" />
                              </span>
                            )}
                          </div>

                          {/* Konten Tahapan Stepper */}
                          <div className="flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p
                                  className={`text-sm font-bold ${
                                    step.state === "selesai" || step.state === "aktif"
                                      ? "text-[#193652]"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {step.label}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">{step.time}</p>
                              </div>

                              {/* Badge Kanan (Selesai / Tahap Saat Ini / Menunggu) */}
                              <div>
                                {step.state === "selesai" ? (
                                  <span className="rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[11px] font-semibold text-[#16a34a] border border-[#bbf7d0]">
                                    Selesai
                                  </span>
                                ) : step.state === "aktif" ? (
                                  <span className="rounded-full bg-[#e7f5f3] px-2.5 py-0.5 text-[11px] font-semibold text-[#107b73] border border-[#bde5df]">
                                    Tahap Saat Ini
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-200">
                                    Menunggu
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 4. Banner Bawah (Pembaruan status berikutnya) */}
                <section className="flex items-start gap-3 rounded-2xl border border-[#d0e6f7] bg-[#eef6fc] p-4 text-[#193652]">
                  <IconBell className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-bold text-[#193652]">Pembaruan status berikutnya</p>
                    <p className="text-slate-600 mt-0.5">
                      Pembaruan berikutnya akan ditampilkan setelah tahap penanganan memiliki perkembangan yang dapat dibagikan.
                    </p>
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                Belum ada laporan yang dipilih
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
