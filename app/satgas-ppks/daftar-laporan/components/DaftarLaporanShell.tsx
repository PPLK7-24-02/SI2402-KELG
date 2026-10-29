"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { LaporanRow, SatgasInfo } from "./types";
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Video,
  FolderOpen,
  Siren,
  ClipboardCheck,
  History,
  BarChart2,
  BookOpen,
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  ArrowRight,
} from "./icons";

interface Props {
  laporan: LaporanRow[];
  satgas: SatgasInfo;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }
> = {
  DITERIMA: {
    label: "Diterima",
    color: "text-[#2563eb]",
    bg: "bg-[#eff6ff] border-[#bfdbfe]",
    dot: "bg-[#2563eb]",
    icon: <Clock size={13} />,
  },
  DIVERIFIKASI: {
    label: "Diverifikasi",
    color: "text-[#7c3aed]",
    bg: "bg-[#f5f3ff] border-[#ddd6fe]",
    dot: "bg-[#7c3aed]",
    icon: <CheckCircle size={13} />,
  },
  DITANGANI: {
    label: "Ditangani",
    color: "text-[#0369a1]",
    bg: "bg-[#f0f9ff] border-[#bae6fd]",
    dot: "bg-[#0369a1]",
    icon: <ClipboardCheck size={13} />,
  },
  SELESAI: {
    label: "Selesai",
    color: "text-[#16a34a]",
    bg: "bg-[#f0fdf4] border-[#bbf7d0]",
    dot: "bg-[#16a34a]",
    icon: <CheckCircle size={13} />,
  },
  TIDAK_VALID: {
    label: "Tidak Valid",
    color: "text-[#dc2626]",
    bg: "bg-[#fef2f2] border-[#fecaca]",
    dot: "bg-[#dc2626]",
    icon: <XCircle size={13} />,
  },
};

const URGENSI_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  RENDAH: { label: "Rendah", color: "text-[#16a34a]", dot: "bg-[#22c55e]" },
  SEDANG: { label: "Sedang", color: "text-[#d97706]", dot: "bg-[#f59e0b]" },
  TINGGI: { label: "Tinggi", color: "text-[#dc2626]", dot: "bg-[#ef4444]" },
  DARURAT: { label: "Darurat", color: "text-[#9333ea]", dot: "bg-[#a855f7]" },
};

const NAV_ITEMS = [
  { href: "/satgas-ppks", label: "Dashboard", icon: "dashboard" },
  {
    href: "/satgas-ppks/daftar-laporan",
    label: "Manajemen Laporan",
    icon: "laporan",
    active: true,
  },
  { href: "/satgas-ppks/monitoring-cctv", label: "Monitoring CCTV", icon: "cctv" },
  { href: "/satgas-ppks/pengelolaan-bukti", label: "Pengelolaan Bukti", icon: "bukti" },
  { href: "/satgas-ppks/incident-alert", label: "Incident Alert AI", icon: "alert", badge: 3 },
  { href: "/satgas-ppks/hasil-pemeriksaan", label: "Hasil Pemeriksaan", icon: "periksa" },
  { href: "/satgas-ppks/riwayat-penanganan", label: "Riwayat Penanganan", icon: "riwayat" },
  { href: "/satgas-ppks/statistik-kasus", label: "Statistik Kasus", icon: "statistik" },
  { href: "/satgas-ppks/manajemen-edukasi", label: "Manajemen Edukasi", icon: "edukasi" },
];

function NavIcon({ type }: { type: string }) {
  const cls = "w-[18px] h-[18px] shrink-0";
  switch (type) {
    case "dashboard": return <LayoutDashboard className={cls} />;
    case "laporan": return <FileText className={cls} />;
    case "cctv": return <Video className={cls} />;
    case "bukti": return <FolderOpen className={cls} />;
    case "alert": return <Siren className={cls} />;
    case "periksa": return <ClipboardCheck className={cls} />;
    case "riwayat": return <History className={cls} />;
    case "statistik": return <BarChart2 className={cls} />;
    case "edukasi": return <BookOpen className={cls} />;
    default: return <FileText className={cls} />;
  }
}

function formatDate(dt: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dt));
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-gray-600",
    bg: "bg-gray-100 border-gray-200",
    dot: "bg-gray-500",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.color} ${cfg.bg}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function UrgensiDot({ urgensi }: { urgensi: string }) {
  const cfg = URGENSI_CONFIG[urgensi] ?? {
    label: urgensi,
    color: "text-gray-500",
    dot: "bg-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

function NeedsAttentionBadge({ status }: { status: string }) {
  if (status === "DITERIMA") {
    return (
      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#fff3cd] px-1.5 py-0.5 text-[10px] font-bold text-[#92400e]">
        <AlertTriangle size={9} />
        Perlu tindakan
      </span>
    );
  }
  return null;
}

export default function DaftarLaporanShell({ laporan, satgas }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [filterUrgensi, setFilterUrgensi] = useState("SEMUA");
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    return laporan.filter((l) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        l.nomorKasus.toLowerCase().includes(q) ||
        l.kategori.nama.toLowerCase().includes(q) ||
        l.lokasi.namaGedung.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "SEMUA" || l.status === filterStatus;
      const matchUrgensi =
        filterUrgensi === "SEMUA" || l.tingkatUrgensi === filterUrgensi;
      return matchQuery && matchStatus && matchUrgensi;
    });
  }, [laporan, searchQuery, filterStatus, filterUrgensi]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  const needsAttentionCount = laporan.filter(
    (l) => l.status === "DITERIMA"
  ).length;

  const handleReset = () => {
    setSearchQuery("");
    setFilterStatus("SEMUA");
    setFilterUrgensi("SEMUA");
    setCurrentPage(1);
  };

  return (
    <div className="flex min-h-screen bg-[#f5f8fb]" style={{ fontFamily: "'Inter', 'Geist', Arial, sans-serif" }}>
      {/* ── Sidebar ────────────────────────────────────────────── */}
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="satgas-sidebar"
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#0f2133] text-white
          transition-transform duration-300
          ${sidebarOpen ? "flex translate-x-0" : "hidden -translate-x-full lg:flex lg:translate-x-0"}
          lg:relative lg:inset-auto lg:z-auto lg:flex lg:translate-x-0
        `}
      >
        {/* Logo */}
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
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi Satgas PPKS">
          <p className="mb-2 px-2 text-[10px] font-bold tracking-[0.12em] text-white/40">
            MENU UTAMA
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  id={`nav-${item.icon}`}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                    ${
                      item.active
                        ? "bg-[#107b73] text-white shadow-lg shadow-[#107b73]/30"
                        : "text-white/60 hover:bg-white/8 hover:text-white"
                    }`}
                >
                  <NavIcon type={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : item.active ? (
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-sm font-bold text-white">
              {satgas.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{satgas.name}</p>
              <p className="text-[11px] text-white/50">Petugas Satgas PPKS</p>
            </div>
            <Link
              href="/api/auth/signout"
              id="btn-logout"
              title="Keluar"
              className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[#e5edf2] bg-white px-5 py-3.5 shadow-sm">
          <button
            id="btn-toggle-sidebar"
            className="rounded-lg p-2 text-[#193652] hover:bg-[#f0f4f8] lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka navigasi"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-[#71839c]" aria-label="Breadcrumb">
            <Link href="/satgas-ppks" className="hover:text-[#107b73]">
              SAFE SPACE
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-[#193652]">Manajemen Laporan</span>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {needsAttentionCount > 0 && (
              <div className="hidden items-center gap-2 rounded-xl bg-[#fff3cd] px-3 py-1.5 text-xs font-semibold text-[#92400e] sm:flex">
                <AlertTriangle className="h-3.5 w-3.5" />
                {needsAttentionCount} kasus perlu tindakan
              </div>
            )}

            <button
              id="btn-notif"
              className="relative rounded-xl border border-[#e5edf2] bg-white p-2 text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73]"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
              {needsAttentionCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {needsAttentionCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-sm font-bold text-white">
                {satgas.initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#193652]">{satgas.name}</p>
                <p className="text-[11px] text-[#71839c]">Petugas Satgas PPKS</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="flex-1 px-5 py-6 sm:px-8 lg:px-10">
          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-[#193652]">Manajemen Laporan</h1>
            <p className="mt-1 text-sm text-[#71839c]">
              Tinjau dan kelola laporan kasus yang diterima oleh Satgas PPKS.
            </p>
          </div>

          {/* Sensitif banner */}
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
            <div>
              <p className="text-sm font-semibold text-[#1e40af]">
                Informasi laporan bersifat sensitif
              </p>
              <p className="mt-0.5 text-xs text-[#3b82f6]">
                Identitas pelapor ditampilkan sesuai hak akses petugas dan pilihan privasi pelapor.
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Laporan", value: laporan.length, color: "text-[#193652]", bg: "bg-white" },
              {
                label: "Perlu Tindakan",
                value: needsAttentionCount,
                color: "text-[#dc2626]",
                bg: "bg-[#fef2f2] border-[#fecaca]",
              },
              {
                label: "Sedang Ditangani",
                value: laporan.filter((l) =>
                  ["DIVERIFIKASI", "DITANGANI"].includes(l.status)
                ).length,
                color: "text-[#0369a1]",
                bg: "bg-[#f0f9ff] border-[#bae6fd]",
              },
              {
                label: "Selesai",
                value: laporan.filter((l) => l.status === "SELESAI").length,
                color: "text-[#16a34a]",
                bg: "bg-[#f0fdf4] border-[#bbf7d0]",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border px-4 py-4 ${stat.bg}`}
              >
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="mt-1 text-xs text-[#71839c]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Filter & search */}
          <div className="mb-5 rounded-2xl border border-[#e5edf2] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0afbd]" />
                <input
                  id="input-search-laporan"
                  type="text"
                  placeholder="Cari nomor kasus, kategori, atau lokasi..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full rounded-xl border border-[#dce6ec] pl-9 pr-3 text-sm text-[#193652] outline-none placeholder:text-[#a0afbd] focus:border-[#107b73] focus:ring-2 focus:ring-[#107b73]/20"
                />
              </div>

              <select
                id="select-filter-status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border border-[#dce6ec] bg-white px-3 text-sm text-[#193652] outline-none focus:border-[#107b73] focus:ring-2 focus:ring-[#107b73]/20"
              >
                <option value="SEMUA">Semua Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>

              <select
                id="select-filter-urgensi"
                value={filterUrgensi}
                onChange={(e) => {
                  setFilterUrgensi(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border border-[#dce6ec] bg-white px-3 text-sm text-[#193652] outline-none focus:border-[#107b73] focus:ring-2 focus:ring-[#107b73]/20"
              >
                <option value="SEMUA">Semua Urgensi</option>
                {Object.entries(URGENSI_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>

              {(searchQuery || filterStatus !== "SEMUA" || filterUrgensi !== "SEMUA") && (
                <button
                  id="btn-reset-filter"
                  onClick={handleReset}
                  className="flex h-10 items-center gap-2 rounded-xl border border-[#dce6ec] px-3 text-sm font-medium text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Daftar laporan header */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#193652]">Daftar laporan</h2>
              <p className="text-xs text-[#71839c]">
                {filtered.length} laporan ditemukan
                {(searchQuery || filterStatus !== "SEMUA" || filterUrgensi !== "SEMUA") && (
                  <span className="ml-1 text-[#107b73]">(difilter)</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#e5edf2] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#71839c]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#107b73]" />
              Akses terbatas Satgas PPKS
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-[#e5edf2] bg-white shadow-sm">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#a0afbd]">
                <FileText className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">Tidak ada laporan ditemukan</p>
                {(searchQuery || filterStatus !== "SEMUA" || filterUrgensi !== "SEMUA") && (
                  <button
                    onClick={handleReset}
                    className="mt-1 text-xs font-semibold text-[#107b73] hover:underline"
                  >
                    Reset filter
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e5edf2] bg-[#f8fafc]">
                      {[
                        "NOMOR KASUS",
                        "KATEGORI KASUS",
                        "TANGGAL LAPORAN",
                        "LOKASI KEJADIAN",
                        "PELAPOR / IDENTITAS",
                        "TINGKAT URGENSI",
                        "STATUS",
                        "AKSI",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3.5 text-left text-[10px] font-extrabold tracking-[0.08em] text-[#8fa3b8]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f4f8]">
                    {paginated.map((row) => (
                      <tr
                        key={row.idLaporan}
                        className={`group transition-colors hover:bg-[#f8fafc] ${
                          row.status === "DITERIMA"
                            ? "bg-[#fffdf8]"
                            : ""
                        }`}
                      >
                        {/* Nomor Kasus */}
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-[#107b73]">
                            #{row.nomorKasus}
                          </span>
                          <NeedsAttentionBadge status={row.status} />
                        </td>

                        {/* Kategori */}
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-[#193652]">
                            {row.kategori.nama}
                          </span>
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-3.5 text-[#60748b]">
                          {formatDate(row.waktuKejadian)}
                        </td>

                        {/* Lokasi */}
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-[#193652]">
                            {row.lokasi.namaGedung}
                          </span>
                          {row.lokasi.area && (
                            <p className="text-[11px] text-[#a0afbd]">
                              {row.lokasi.area}
                            </p>
                          )}
                        </td>

                        {/* Pelapor */}
                        <td className="px-4 py-3.5">
                          {row.isAnonim ? (
                            <span className="text-[#a0afbd] italic text-xs">
                              Pelapor anonim
                            </span>
                          ) : (
                            <>
                              <span className="font-semibold text-[#193652]">
                                {row.pelapor.nama}
                              </span>
                              {row.pelapor.jenisPengguna && (
                                <p className="text-[11px] text-[#a0afbd]">
                                  {row.pelapor.jenisPengguna.charAt(0) +
                                    row.pelapor.jenisPengguna.slice(1).toLowerCase()}
                                </p>
                              )}
                            </>
                          )}
                        </td>

                        {/* Urgensi */}
                        <td className="px-4 py-3.5">
                          <UrgensiDot urgensi={row.tingkatUrgensi} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/satgas-ppks/daftar-laporan/${row.idLaporan}`}
                            id={`btn-lihat-detail-${row.idLaporan}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce6ec] bg-white px-3 py-1.5 text-xs font-bold text-[#107b73] transition hover:border-[#107b73] hover:bg-[#f0faf8] hover:shadow-sm"
                          >
                            Lihat Detail
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#f0f4f8] px-5 py-3.5">
                <p className="text-xs text-[#71839c]">
                  Menampilkan {(currentPage - 1) * PER_PAGE + 1}–
                  {Math.min(currentPage * PER_PAGE, filtered.length)} dari{" "}
                  {filtered.length} laporan
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-prev-page"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="rounded-lg border border-[#dce6ec] px-3 py-1.5 text-xs font-semibold text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Sebelumnya
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                    )
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-[#a0afbd]">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          id={`btn-page-${p}`}
                          onClick={() => setCurrentPage(p as number)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            currentPage === p
                              ? "bg-[#107b73] text-white"
                              : "border border-[#dce6ec] text-[#60748b] hover:border-[#107b73] hover:text-[#107b73]"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    id="btn-next-page"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-lg border border-[#dce6ec] px-3 py-1.5 text-xs font-semibold text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
