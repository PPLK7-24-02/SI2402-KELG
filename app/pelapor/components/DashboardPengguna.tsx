"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Search,
  ShieldCheck,
} from "./icons";

type DashboardData = {
  pelapor: {
    idPelapor: string;
    nama: string;
  };
  ringkasanLaporan: {
    totalLaporan: number;
    laporanDikirim: number;
    laporanDalamProses: number;
    laporanSelesai: number;
  };
  laporanTerbaru: {
    idLaporan: string;
    nomorKasus: string;
    status: string;
    createdAt: string;
    kategoriId: string;
    kategori: {
    nama: string;
    };
  }[];
  notifikasi: {
    totalBelumDibaca: number;
    daftar: {
      idNotif: string;
      judul: string;
      pesan: string;
      tipe: string;
      isRead: boolean;
      createdAt: string;
      laporanId: string | null;
    }[];
  };
  aksesCepat: {
    label: string;
    deskripsi: string;
    path: string;
  }[];
};

type DashboardResponse = {
  success: boolean;
  message?: string;
  callbackUrl?: string;
  data?: DashboardData;
};

class DashboardRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly callbackUrl?: string
  ) {
    super(message);
    this.name = "DashboardRequestError";
  }
}

async function fetchDashboard(signal?: AbortSignal) {
  const response = await fetch("/api/dashboard_pengguna", {
    cache: "no-store",
    signal,
  });
  const result = (await response.json()) as DashboardResponse;

  if (!response.ok || !result.success || !result.data) {
    throw new DashboardRequestError(
      result.message || "Data dashboard tidak dapat dimuat.",
      response.status,
      result.callbackUrl
    );
  }
  return result.data;
}

function redirectToLogin(
  navigate: (href: string) => void,
  callbackUrl?: string
) {
  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set(
    "callbackUrl",
    callbackUrl ||
      `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
  navigate(`${loginUrl.pathname}${loginUrl.search}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan saat memuat dashboard.";}

type IconName =
  | "home"
  | "edit"
  | "alert"
  | "search"
  | "book"
  | "bell"
  | "shield"
  | "file"
  | "clock"
  | "check"
  | "send"
  | "arrow"
  | "chevron";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
        <path d="M4 16h16M8 7h8m-8 3h8" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6m-11 5h6m-6 4h6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    chevron: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const statusStyles: Record<string, string> = {
  DITERIMA: "bg-sky-50 text-sky-700",
  REVIEW: "bg-amber-50 text-amber-700",
  DIVERIFIKASI: "bg-blue-50 text-blue-700",
  DITANGANI: "bg-orange-50 text-orange-700",
  SELESAI: "bg-emerald-50 text-emerald-700",
  TIDAK_VALID: "bg-rose-50 text-rose-700",
  DITUTUP: "bg-slate-100 text-slate-600",
};

const statusLabels: Record<string, string> = {
  DITERIMA: "Diterima",
  REVIEW: "Dalam Review",
  DIVERIFIKASI: "Diverifikasi",
  DITANGANI: "Ditangani",
  SELESAI: "Selesai",
  TIDAK_VALID: "Tidak Valid",
  DITUTUP: "Ditutup",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const NAV_ITEMS = [
  { href: "/pelapor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pelapor/buat-laporan", label: "Buat Laporan", icon: FileText },
  { href: "/pelapor/case-tracking", label: "Lihat Status Laporan", icon: Search},
  { href: "/edukasi", label: "Edukasi", icon: BookOpen },
];

const MOBILE_NAV_ITEMS = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  null,
  NAV_ITEMS[2],
  NAV_ITEMS[3],
];

export default function DashboardPengguna() {
  const router = useRouter();
  const pathname = usePathname();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboard(controller.signal)
      .then(setDashboard)
      .catch((loadError: unknown) => {
        if (
          loadError instanceof Error &&
          loadError.name !== "AbortError"
        ) {
          if (
            loadError instanceof DashboardRequestError &&
            loadError.status === 401
          ) {
            redirectToLogin(
              (href) => router.replace(href),
              loadError.callbackUrl
            );
            return;
          }

          setError(getErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [router]);

  async function retryDashboard() {
    setIsLoading(true);
    setError("");

    try {
      setDashboard(await fetchDashboard());
    } catch (loadError) {
      if (
        loadError instanceof DashboardRequestError &&
        loadError.status === 401
      ) {
        redirectToLogin(
          (href) => router.replace(href),
          loadError.callbackUrl
        );
        return;
      }

      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  const quickAccess = dashboard?.aksesCepat ?? [];
  const emergencyReport = quickAccess.find(
    (item) =>
      item.label === "Emergency Report" || item.path === "/emergency-report"
  );
  const metrics = dashboard
    ? [
        {
          label: "Total Laporan Saya",
          value: dashboard.ringkasanLaporan.totalLaporan,
          caption: "Seluruh laporan pribadi",
          icon: "file" as const,
          color: "teal",
        },
        {
          label: "Laporan Dikirim",
          value: dashboard.ringkasanLaporan.laporanDikirim,
          caption: "Menunggu penanganan",
          icon: "send" as const,
          color: "blue",
        },
        {
          label: "Laporan Dalam Proses",
          value: dashboard.ringkasanLaporan.laporanDalamProses,
          caption: "Memerlukan pemantauan",
          icon: "clock" as const,
          color: "amber",
        },
        {
          label: "Laporan Selesai",
          value: dashboard.ringkasanLaporan.laporanSelesai,
          caption: "Penanganan selesai",
          icon: "check" as const,
          color: "green",
        },
      ]
    : [];

  return (
    <div
      data-pelapor-dashboard
      className="flex min-h-screen overflow-x-hidden bg-[#f3f6fa] text-[#193652]"
    >
      <aside
        id="pelapor-sidebar"
        className="hidden w-64 shrink-0 flex-col bg-[#0f2133] text-white lg:relative lg:inset-auto lg:z-auto lg:flex"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-black tracking-wider">SAFE SPACE</p>
            <p className="text-[10px] text-white/50">Portal Pelapor</p>
          </div>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Navigasi Pelapor"
        >
          <p className="mb-2 px-2 text-[10px] font-bold tracking-[0.12em] text-white/40">
            MENU UTAMA
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/pelapor" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#107b73] text-white shadow-lg shadow-[#107b73]/30"
                        : "text-white/60 hover:bg-white/8 hover:text-white"
                    }`}>
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-start gap-3 rounded-xl bg-white/[0.06] p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#80ddd2]" />
            <div>
              <p className="text-[11px] font-semibold">Privasi Anda dijaga</p>
              <p className="mt-1 text-[10px] leading-4 text-white/50">
                Hanya informasi yang dapat Anda akses yang ditampilkan.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#e5ebf1] bg-white px-4 py-3 sm:gap-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo_safespace.png"
              alt="Logo SAFE SPACE"
              width={32} height={39}
              className="h-9 w-auto shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0d8277]">
                Portal Pelapor
              </p>
              <h1 className="mt-0.5 truncate text-sm font-bold">
                Dashboard Saya
              </h1>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              aria-label={`Notifikasi, ${dashboard?.notifikasi.totalBelumDibaca ?? 0} belum dibaca`}
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-50">
              <Icon name="bell" className="h-[18px] w-[18px]" />
              {!!dashboard?.notifikasi.totalBelumDibaca && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
              )}
            </button>
            <span className="h-6 border-l border-slate-200" />
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6f4f2] text-[10px] font-bold text-[#0d8277]">
                  {dashboard ? getInitials(dashboard.pelapor.nama) : "—"}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[11px] font-semibold">
                    {dashboard?.pelapor.nama ?? "Memuat akun"}
                  </span>
                  <span className="block text-[9px] text-slate-400">
                    Pelapor
                  </span>
                </span>
                <Icon
                  name="chevron"
                  className="h-3.5 w-3.5 rotate-90 text-slate-400 transition-transform group-open:-rotate-90"/>
              </summary>
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-[#e1e8ef] bg-white p-1.5 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
                  <p className="truncate text-[11px] font-semibold">
                    {dashboard?.pelapor.nama ?? "Memuat akun"}
                  </p>
                  <p className="text-[9px] text-slate-400">Pelapor</p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50">
                  <Icon name="arrow" className="h-4 w-4 rotate-180" />
                  Logout
                </button>
              </div>
            </details>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pt-6 pb-32 sm:px-6 sm:pb-32 lg:px-8 lg:pb-6">
          <section className="mb-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#0d8277]">
              Selamat datang
            </p>
            <h2 className="mt-1 text-[25px] font-bold tracking-tight">
              {dashboard ? `Halo, ${dashboard.pelapor.nama}` : "Dashboard Pelapor"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Akses laporan pribadi Anda, pantau perkembangannya, dan temukan
              bantuan yang dibutuhkan dari satu halaman.
            </p>
          </section>

          <div className="mb-5 flex items-start gap-2 rounded-lg border border-[#d9efeb] bg-[#e9f6f4] px-3 py-2.5 text-[10px] leading-4 text-[#527b79]">
            <Icon
              name="shield"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#14877d]"/>
            <p>
              Halaman ini hanya menampilkan informasi laporan yang dapat Anda
              akses. Catatan internal, bukti CCTV, dan identitas pihak lain
              tidak ditampilkan.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void retryDashboard()}
                className="font-semibold underline underline-offset-2">
                Coba lagi
              </button>
            </div>
          )}

          <section
            aria-label="Ringkasan laporan"
            className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
               ? [0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-[102px] animate-pulse rounded-xl border border-[#e4eaf0] bg-white"/>
                ))
              : metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-xl border border-[#e4eaf0] bg-white p-4 shadow-[0_2px_8px_rgba(25,54,82,0.04)]">
                    <div className="flex items-start gap-3">
                      <span
                        className={`rounded-lg p-2 ${
                          metric.color === "teal"
                          ? "bg-[#e7f5f3] text-[#13877d]"
                          : metric.color === "blue"
                          ? "bg-blue-50 text-blue-600"
                          : metric.color === "amber"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-emerald-50 text-emerald-600"
                        }`}>
                        <Icon name={metric.icon} className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[10px] text-slate-500">
                          {metric.label}
                        </p>
                        <p className="mt-0.5 text-[22px] font-bold leading-6">
                          {metric.value}
                        </p>
                        <p className="mt-1.5 text-[9px] text-slate-400">
                          {metric.caption}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
          </section>

          <section aria-labelledby="akses-cepat-title" className="mb-6">
            <div className="mb-3">
              <h2 id="akses-cepat-title" className="text-sm font-bold">
                Akses Cepat
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Pilih layanan yang ingin Anda akses.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickAccess.map((item, index) => {
                const icon: IconName[] = ["edit", "alert", "search", "book"];
                const colorStyles = [
                  "border-[#e4eaf0] bg-[#e8f5f3] text-[#13877d]",
                  "border-rose-100 bg-rose-50 text-rose-500",
                  "border-[#e4eaf0] bg-[#e8f5f3] text-[#13877d]",
                  "border-[#e4eaf0] bg-[#e8f5f3] text-[#13877d]",
                ];
                const isEmergencyReport =
                  item.label === "Emergency Report" ||
                  item.path === "/emergency-report";

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`group ${
                      isEmergencyReport ? "hidden lg:flex" : "flex"
                    } min-h-[86px] items-start gap-3 rounded-xl border bg-white p-3.5 shadow-[0_2px_8px_rgba(25,54,82,0.04)] transition hover:-translate-y-0.5 hover:shadow-md ${
                      index === 1 ? "border-rose-100" : "border-[#e4eaf0]"
                    }`}>
                    <span
                      className={`rounded-lg p-2 ${colorStyles[index] ?? colorStyles[0]}`}>
                      <Icon name={icon[index] ?? "file"} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[10px] font-bold ${
                          index === 1 ? "text-rose-600" : "text-[#193652]"
                        }`}>
                        {item.label}
                      </span>
                      <span className="mt-1 block text-[9px] leading-4 text-slate-500">
                        {item.deskripsi}
                      </span>
                    </span>
                    <Icon
                      name="chevron"
                      className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5"/>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
            <section
              aria-labelledby="laporan-terbaru-title"
              className="overflow-hidden rounded-xl border border-[#e1e8ef] bg-white shadow-[0_2px_8px_rgba(25,54,82,0.04)]">
              <div className="flex items-center justify-between border-b border-[#e9eef3] px-4 py-3.5">
                <div>
                  <h2 id="laporan-terbaru-title" className="text-sm font-bold">
                    Laporan Saya Terbaru
                  </h2>
                  <p className="mt-1 text-[9px] text-slate-500">
                    Perkembangan terbaru dari laporan pribadi Anda.
                  </p>
                </div>
                <Link
                  href={
                    quickAccess.find(
                      (item) => item.label === "Lihat Status Laporan"
                    )?.path ?? "/pelapor/case-tracking"
                  }
                  className="flex items-center gap-1 text-[9px] font-semibold text-[#0d8277] hover:underline">
                  Lihat Semua
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-8 animate-pulse rounded bg-slate-100"/>
                  ))}
                </div>
              ) : dashboard?.laporanTerbaru.length ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left">
                      <thead>
                        <tr className="bg-[#f8fafc] text-[8px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-2.5">Nomor Kasus</th>
                          <th className="px-4 py-2.5">Kategori</th>
                          <th className="px-4 py-2.5">Tanggal</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf1f5]">
                        {dashboard.laporanTerbaru.map((report) => (
                          <tr
                            key={report.idLaporan}
                            className="text-[9px] text-slate-600">
                            <td className="whitespace-nowrap px-4 py-3 font-bold text-[#193652]">
                              {report.nomorKasus}
                            </td>
                            <td className="px-4 py-3">
                              {report.kategori.nama}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(report.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold ${
                                  statusStyles[report.status] ??
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                {report.status === "SELESAI" ? (
                                  <Icon name="check" className="h-3 w-3" />
                                ) : (
                                  <Icon name="clock" className="h-3 w-3" />
                                )}
                                {statusLabels[report.status] ?? report.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <Link
                                href={
                                  quickAccess.find(
                                    (item) =>
                                      item.label === "Lihat Status Laporan"
                                  )?.path ?? "/pelapor/case-tracking"
                                }
                                className="font-semibold text-[#0d8277] hover:underline">
                                Lihat Status
                                <span className="sr-only">
                                  {" "}
                                  untuk {report.nomorKasus}
                                </span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="px-5 py-10 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <Icon name="file" className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-xs font-semibold">
                    Belum ada laporan
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Laporan Anda akan muncul di sini setelah dikirim.
                  </p>
                </div>
              )}
            </section>

            <section
              aria-labelledby="notifikasi-terbaru-title"
              className="overflow-hidden rounded-xl border border-[#e1e8ef] bg-white shadow-[0_2px_8px_rgba(25,54,82,0.04)]">
              <div className="flex items-center justify-between border-b border-[#e9eef3] px-4 py-3.5">
                <div>
                  <h2
                    id="notifikasi-terbaru-title"
                    className="text-sm font-bold">
                    Notifikasi Terbaru
                  </h2>
                  <p className="mt-1 text-[9px] text-slate-500">
                    Pemberitahuan yang berkaitan dengan laporan Anda.
                  </p>
                </div>
                {!isLoading && dashboard && (
                  <span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[8px] font-semibold text-[#0d8277]">
                    {dashboard.notifikasi.totalBelumDibaca} baru
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-12 animate-pulse rounded bg-slate-100"/>
                  ))}
                </div>
              ) : dashboard?.notifikasi.daftar.length ? (
                <ul className="divide-y divide-[#edf1f5]">
                  {dashboard.notifikasi.daftar.map((notification, index) => (
                    <li key={notification.idNotif}>
                      <Link
                        href={
                          quickAccess.find(
                            (item) =>
                              item.label === "Lihat Status Laporan"
                          )?.path ?? "/case-tracking"
                        }
                        className={`flex gap-3 border-l-2 px-3 py-3 transition hover:bg-slate-50 ${
                          notification.isRead
                            ? "border-transparent"
                            : "border-[#0d8277]"
                        }`}>
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            index % 3 === 0
                              ? "bg-[#e8f5f3] text-[#13877d]"
                              : index % 3 === 1
                                ? "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                          }`}>
                          <Icon
                            name={
                              index % 3 === 1
                                ? "clock"
                                : index % 3 === 2
                                  ? "check"
                                  : "bell"
                            }
                            className="h-3.5 w-3.5"/>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-[9px] font-bold text-[#193652]">
                              {notification.judul}
                            </span>
                            <Icon
                              name="chevron"
                              className="h-3.5 w-3.5 shrink-0 text-slate-400"/>
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[8px] leading-3.5 text-slate-500">
                            {notification.pesan}
                          </span>
                          <span className="mt-1 block text-[8px] text-slate-400">
                            {formatDate(notification.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-10 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <Icon name="bell" className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-xs font-semibold">
                    Belum ada notifikasi
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Notifikasi terkait laporan Anda akan muncul di sini.
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>

        {emergencyReport && (
          <div className="fixed inset-x-0 bottom-0 z-10 h-20 rounded-t-lg bg-white/95 shadow-[0_-8px_24px_rgba(25,54,82,0.12)] backdrop-blur-sm before:absolute before:left-1/2 before:-top-11 before:h-[88px] before:w-[88px] before:-translate-x-1/2 before:rounded-full before:bg-[#f3f6fa] before:content-[''] lg:hidden">
            <Link
              href={emergencyReport.path}
              aria-label="Emergency Report"
              className="absolute -top-8 left-1/2 z-10 flex h-[76px] w-[76px] -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-full bg-[#e0242f] text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300">
              <Icon name="alert" className="h-6 w-6" />
              <span className="text-[10px] font-semibold">Darurat</span>
            </Link>
            <nav
              aria-label="Navigasi cepat Pelapor"
              className="absolute inset-x-0 bottom-0 h-full">
              <ul className="grid h-full grid-cols-5 items-end px-1 pb-3">
                {MOBILE_NAV_ITEMS.map((item) =>
                  item ? (
                    <li key={item.href} className="h-full min-w-0">
                      <Link
                        href={item.href}
                        aria-current={
                          pathname === item.href ||
                          (item.href !== "/pelapor" &&
                            pathname.startsWith(`${item.href}/`))
                            ? "page"
                            : undefined}
                        className={`flex h-full flex-col items-center justify-end gap-1 px-0.5 pb-3 text-center text-[9px] font-medium leading-3 ${
                          pathname === item.href ||
                          (item.href !== "/pelapor" &&
                            pathname.startsWith(`${item.href}/`))
                            ? "text-[#107b73]"
                            : "text-slate-500"}`}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="max-w-full">
                          {item.label === "Lihat Status Laporan"
                            ? "Status Laporan"
                            : item.label}
                        </span>
                      </Link>
                    </li>
                  ) : (
                    <li key="emergency-slot" aria-hidden="true" />))}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}