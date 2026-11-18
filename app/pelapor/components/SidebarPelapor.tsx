"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Search,
  ShieldCheck,
} from "./icons";

type SidebarPelaporProps = {
  emergencyReport?: {
    path: string;
  };
};

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


export default function SidebarPelapor({
  emergencyReport,
}: SidebarPelaporProps) {
  const pathname = usePathname();

  return (
    <>
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

        {emergencyReport && (
          <div className="fixed inset-x-0 bottom-0 z-10 h-20 rounded-t-lg bg-white/95 shadow-[0_-8px_24px_rgba(25,54,82,0.12)] backdrop-blur-sm before:absolute before:left-1/2 before:-top-11 before:h-[88px] before:w-[88px] before:-translate-x-1/2 before:rounded-full before:bg-[#f3f6fa] before:content-[''] lg:hidden">
            <Link
              href={emergencyReport.path}
              aria-label="Emergency Report"
              className="absolute -top-8 left-1/2 z-10 flex h-[76px] w-[76px] -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-full bg-[#e0242f] text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="m12 3 10 18H2L12 3Z" />
                <path d="M12 9v5m0 3h.01" />
              </svg>
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
    </>
  );
}
