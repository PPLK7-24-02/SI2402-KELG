"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import {
  BarChart2,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Siren,
  Video,
  X,
} from "./icons";

export type SatgasSidebarInfo = { name: string; initials: string };

const NAV_ITEMS = [
  { href: "/satgas-ppks", label: "Dashboard", icon: LayoutDashboard },
  { href: "/satgas-ppks/daftar-laporan", label: "Manajemen Laporan", icon: FileText },
  { href: "/satgas-ppks/monitoring-cctv", label: "Monitoring CCTV", icon: Video },
  { href: "/satgas-ppks/pengelolaan-bukti", label: "Pengelolaan Bukti", icon: FolderOpen },
  { href: "/satgas-ppks/incident-alert", label: "Incident Alert AI", icon: Siren },
  { href: "/satgas-ppks/us-05", label: "Hasil Pemeriksaan", icon: ClipboardCheck },
  { href: "/satgas-ppks/riwayat-penanganan", label: "Riwayat Penanganan", icon: History },
  { href: "/satgas-ppks/statistik-kasus", label: "Statistik Kasus", icon: BarChart2 },
  { href: "/satgas-ppks/manajemen-edukasi", label: "Manajemen Edukasi", icon: BookOpen },
];

// Menu aktif ditentukan dari URL, jadi halaman Satgas mana pun cukup memakai komponen ini.
function isActive(pathname: string, href: string) {
  if (href === "/satgas-ppks") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarSatgas({
  satgas,
  open,
  onClose,
}: {
  satgas: SatgasSidebarInfo;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#0f2133] text-white
          transition-transform duration-300
          ${open ? "flex translate-x-0" : "hidden -translate-x-full lg:flex lg:translate-x-0"}
          lg:sticky lg:inset-auto lg:top-0 lg:h-screen lg:z-auto lg:flex lg:translate-x-0
        `}
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
            onClick={onClose}
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
            {NAV_ITEMS.map((item) => {
              const aktif = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={aktif ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      aktif
                        ? "bg-[#107b73] text-white shadow-lg shadow-[#107b73]/30"
                        : "text-white/60 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {aktif && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-sm font-bold text-white">
              {satgas.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{satgas.name}</p>
              <p className="text-[11px] text-white/50">Petugas Satgas PPKS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/15 hover:text-red-200"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
