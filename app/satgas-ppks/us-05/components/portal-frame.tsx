"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { ChevronRight, ClipboardCheck, FileText, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from "../../components/icons";

export default function PortalFrame({ name, children }: { name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const items = [
    { href: "/satgas-ppks", label: "Dashboard", icon: LayoutDashboard },
    { href: "/satgas-ppks/daftar-laporan", label: "Daftar Laporan", icon: FileText },
    { href: "/satgas-ppks/us-05", label: "Hasil Pemeriksaan", icon: ClipboardCheck },
  ];
  return <div className="flex min-h-screen bg-[#f5f8fb] text-[#193652]">
    {open && <button type="button" className="fixed inset-0 z-20 bg-black/40 lg:hidden" aria-label="Tutup navigasi" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#0f2133] text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="rounded-xl bg-[#107b73] p-2"><ShieldCheck className="h-5 w-5" /></span>
        <div><p className="text-[13px] font-black tracking-wider">SAFE SPACE</p><p className="text-[10px] text-white/50">Satgas PPKS</p></div>
        <button type="button" aria-label="Tutup navigasi" className="ml-auto p-1 lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navigasi Satgas PPKS">
        <p className="mb-3 px-2 text-[10px] font-bold tracking-widest text-white/40">MENU UTAMA</p>
        {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={href.endsWith("us-05") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${href.endsWith("us-05") ? "bg-[#107b73] text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
          <Icon className="h-[18px] w-[18px]" />{label}
        </Link>)}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#107b73] text-sm font-bold">{initials}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="text-[11px] text-white/50">Petugas Satgas PPKS</p></div>
        <button type="button" aria-label="Keluar" onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-lg p-2 hover:bg-white/10"><LogOut className="h-4 w-4" /></button>
      </div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#e5edf2] bg-white px-5 py-3 shadow-sm">
        <button type="button" aria-label="Buka navigasi" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-500">SAFE SPACE <ChevronRight className="h-3 w-3" /> HASIL PEMERIKSAAN</p><p className="text-lg font-bold">Hasil Pemeriksaan</p></div>
        <span className="hidden max-w-48 truncate text-sm sm:block">{name}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-[#107b73]" aria-hidden="true">{initials}</span>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
