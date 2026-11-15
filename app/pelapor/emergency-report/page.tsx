import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import EmergencyReportClient, { EmergencyIcon } from "./emergency-report-client";

export const runtime = "nodejs";

// Page-local icons mirror the Dashboard without changing its implementation.
function PortalIcon({ name, className = "h-5 w-5" }: { name: "home" | "edit" | "alert" | "search" | "book" | "bell" | "shield" | "chevron"; className?: string }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    edit: <path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />,
    alert: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" /><path d="M4 16h16M8 7h8m-8 3h8" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default async function EmergencyReportPage({ searchParams }: { searchParams: Promise<{ report?: string | string[] }> }) {
  const user = (await getServerSession(authOptions))?.user;
  if (!user?.id || user.role !== "PELAPOR") redirect("/login?callbackUrl=/pelapor/emergency-report");
  const query = await searchParams;
  const id = typeof query.report === "string" ? query.report : null;
  let initialReport = null;
  let resumeFailed = false;
  if (query.report !== undefined) {
    try {
      const report = id && id.length <= 30 ? await prisma.laporan.findFirst({
        where: { idLaporan: id, pelaporId: user.id, jenis: "EMERGENCY" },
        select: { idLaporan: true, nomorKasus: true, createdAt: true, detailLokasi: true,
          buktiLaporan: { select: { idBukti: true, namaFile: true, tipeFile: true }, orderBy: { uploadAt: "asc" } } },
      }) : null;
      if (report) initialReport = { idLaporan: report.idLaporan, nomorKasus: report.nomorKasus, createdAt: report.createdAt.toISOString(), detailLokasi: report.detailLokasi, lampiran: report.buktiLaporan };
      else resumeFailed = true;
    } catch { resumeFailed = true; }
  }
  const name = user.name?.trim() || "Pelapor";
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const userType = user.jenisPengguna === "MAHASISWA" ? "Mahasiswa" : user.jenisPengguna === "DOSEN" ? "Dosen" : user.jenisPengguna === "STAFF" ? "Staf" : "Pelapor";
  const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500";
  const navigation = [
    { label: "Dashboard", href: "/pelapor", icon: "home" as const },
    { label: "Buat Laporan", href: "/pelapor/buat-laporan", icon: "edit" as const },
    { label: "Laporan Darurat", href: "/pelapor/emergency-report", icon: "alert" as const, active: true },
    { label: "Status Laporan", href: "/pelapor#laporan-terbaru-title", icon: "search" as const },
  ];
  return <div className="min-h-screen min-w-0 bg-[#f3f6fa] text-[#193652] md:flex">
    <aside className="flex w-full shrink-0 flex-col bg-[#193652] text-white md:sticky md:top-0 md:h-screen md:w-60" aria-label="Portal Pelapor">
      <div className="flex items-center justify-between px-5 py-5 md:block md:px-6 md:py-7">
        <Link href="/pelapor" className={`rounded-sm ${focus}`}>
          <span className="block text-sm font-extrabold tracking-wide">SAFE SPACE</span>
          <span className="mt-1 block text-[10px] text-slate-300">Portal Pelapor</span>
        </Link>
        <span className="rounded-full bg-white/10 p-2 text-slate-200 md:hidden"><PortalIcon name="shield" className="h-4 w-4" /></span>
      </div>
      <nav aria-label="Menu Pelapor" className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:px-3 md:pb-0">
        <p className="hidden px-3 pb-3 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 md:block">Menu Pelapor</p>
        {navigation.map(item => <Link key={item.label} href={item.href} aria-current={item.active ? "page" : undefined}
          className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${focus} ${item.active ? "bg-[#0d8277] text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
          <PortalIcon name={item.icon} className="h-4 w-4" /><span>{item.label}</span>
        </Link>)}
        <span aria-disabled="true" title="Halaman edukasi belum tersedia" className="flex shrink-0 cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400">
          <PortalIcon name="book" className="h-4 w-4" /><span>Edukasi</span><span className="sr-only"> — belum tersedia</span>
        </span>
      </nav>
      <div className="mt-auto hidden px-3 pb-5 md:block">
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3" role="note">
          <div className="flex items-center gap-2 text-[11px] font-semibold"><PortalIcon name="shield" className="h-4 w-4 text-[#80ddd2]" />Utamakan keselamatan Anda</div>
          <p className="mt-2 text-[10px] leading-4 text-slate-300">Tekan tombol darurat terlebih dahulu. Informasi lain dapat dilengkapi saat aman.</p>
        </div>
        <p className="mt-4 text-center text-[9px] text-slate-500">SAFE SPACE · Portal Pelapor</p>
      </div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="flex h-[60px] items-center justify-between border-b border-[#e5ebf1] bg-white px-5 sm:px-8">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0d8277]">Portal Pelapor</p>
          <p className="mt-0.5 text-sm font-bold">Laporan Darurat</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <Link href="/pelapor#notifikasi-terbaru-title" aria-label="Lihat notifikasi di dashboard" className={`relative rounded-full p-2 text-slate-500 hover:bg-slate-50 ${focus}`}><PortalIcon name="bell" className="h-[18px] w-[18px]" /></Link>
          <span className="h-6 border-l border-slate-200" />
          <details className="group relative">
            <summary aria-label="Informasi akun pelapor" className={`flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden ${focus}`}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6f4f2] text-[10px] font-bold text-[#0d8277]">{initials}</span>
              <span className="hidden max-w-44 text-left sm:block"><span className="block truncate text-[11px] font-semibold" title={name}>{name}</span><span className="block text-[9px] text-slate-400">Pelapor</span></span>
              <span className="sr-only sm:hidden">{name}, Pelapor</span>
              <PortalIcon name="chevron" className="h-3.5 w-3.5 rotate-90 text-slate-400 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-[#e1e8ef] bg-white p-1.5 shadow-lg">
              <div className="px-3 py-2"><p className="truncate text-[11px] font-semibold" title={name}>{name}</p><p className="mt-1 text-[9px] text-slate-400">Pelapor · {userType}</p></div>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1800px] px-4 pb-12 pt-7 sm:px-8 sm:pt-8 lg:px-9 lg:pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-6">
          <div className="max-w-[560px]"><p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#ed272d]">Bantuan Cepat</p><h1 className="mt-2 text-[27px] font-bold leading-tight tracking-tight sm:text-[29px]">Laporan Darurat</h1><p className="mt-3 max-w-[500px] text-[13px] leading-[1.65] text-[#75879e]">Gunakan tombol utama untuk membuat laporan awal dan meminta bantuan secepatnya.</p></div>
          <Link href="/pelapor" className={`mb-1 inline-flex items-center gap-2 rounded-sm text-[11px] font-semibold text-[#128b83] hover:text-[#086b65] lg:mr-auto lg:ml-10 ${focus}`}><EmergencyIcon name="back" className="h-3.5 w-3.5" />Kembali ke Dashboard</Link>
        </div>
        <p className="mb-4 text-xs leading-5 text-[#75879e] lg:hidden">Utamakan keselamatan Anda. Lengkapi informasi dan bukti hanya saat aman.</p>
        <EmergencyReportClient key={initialReport?.idLaporan ?? "ready"} ownerId={user.id} initialReport={initialReport} resumeFailed={resumeFailed} />
      </main>
    </div>
  </div>;
}
