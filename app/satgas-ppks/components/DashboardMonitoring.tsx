"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import type { DashboardMonitoringData } from "@/app/api/satgas-ppks/dashboard/route";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Bell,
  BookOpen,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  Video,
  X,
} from "./icons";

type SatgasInfo = { name: string; email: string; initials: string };
type JenisPeriode = "bulanan" | "semester" | "tahunan" | "rentang";
type TabDistribusi = "status" | "kategori" | "lokasi";

const NAV_ITEMS = [
  { href: "/satgas-ppks", label: "Dashboard", icon: LayoutDashboard, active: true },
  { href: "/satgas-ppks/daftar-laporan", label: "Manajemen Laporan", icon: FileText },
  { href: "/satgas-ppks/monitoring-cctv", label: "Monitoring CCTV", icon: Video },
  { href: "/satgas-ppks/pengelolaan-bukti", label: "Pengelolaan Bukti", icon: FolderOpen },
  { href: "/satgas-ppks/incident-alert", label: "Incident Alert AI", icon: Siren },
  { href: "/satgas-ppks/hasil-pemeriksaan", label: "Hasil Pemeriksaan", icon: ClipboardCheck },
  { href: "/satgas-ppks/riwayat-penanganan", label: "Riwayat Penanganan", icon: History },
  { href: "/satgas-ppks/statistik-kasus", label: "Statistik Kasus", icon: BarChart2 },
  { href: "/satgas-ppks/manajemen-edukasi", label: "Manajemen Edukasi", icon: BookOpen },
];

const PILIHAN_PERIODE: { value: JenisPeriode; label: string }[] = [
  { value: "bulanan", label: "Bulanan" },
  { value: "semester", label: "Semesteran" },
  { value: "tahunan", label: "Tahunan" },
  { value: "rentang", label: "Rentang Tanggal" },
];

const STATUS_BADGE: Record<string, { label: string; kelas: string }> = {
  DITERIMA: { label: "Diterima", kelas: "text-[#2563eb] bg-[#eff6ff] border-[#bfdbfe]" },
  DIVERIFIKASI: { label: "Diverifikasi", kelas: "text-[#7c3aed] bg-[#f5f3ff] border-[#ddd6fe]" },
  DITANGANI: { label: "Ditangani", kelas: "text-[#0369a1] bg-[#f0f9ff] border-[#bae6fd]" },
  SELESAI: { label: "Selesai", kelas: "text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]" },
  TIDAK_VALID: { label: "Tidak Valid", kelas: "text-[#dc2626] bg-[#fef2f2] border-[#fecaca]" },
};

const URGENSI: Record<string, { label: string; warna: string; titik: string }> = {
  RENDAH: { label: "Rendah", warna: "text-[#16a34a]", titik: "bg-[#22c55e]" },
  SEDANG: { label: "Sedang", warna: "text-[#d97706]", titik: "bg-[#f59e0b]" },
  TINGGI: { label: "Tinggi", warna: "text-[#dc2626]", titik: "bg-[#ef4444]" },
  DARURAT: { label: "Darurat", warna: "text-[#9333ea]", titik: "bg-[#a855f7]" },
};

const STATUS_ALERT: Record<string, { label: string; kelas: string }> = {
  PENDING: { label: "Menunggu Verifikasi", kelas: "text-[#b45309] bg-[#fffbeb] border-[#fde68a]" },
  TERVERIFIKASI: { label: "Terverifikasi", kelas: "text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]" },
  DITOLAK: { label: "Ditolak", kelas: "text-[#64748b] bg-[#f1f5f9] border-[#e2e8f0]" },
};

const WARNA_DONAT = ["#107b73", "#2563eb", "#f59e0b", "#7c3aed", "#ef4444", "#94a3b8"];
const MAKS_IRISAN = 5;

function formatIso(tanggal: Date) {
  const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
  const hari = String(tanggal.getDate()).padStart(2, "0");
  return `${tanggal.getFullYear()}-${bulan}-${hari}`;
}

// Tahun akademik dimulai Agustus: Ganjil = Agu–Jan, Genap = Feb–Jul.
function semesterSaatIni(sekarang: Date) {
  const bulan = sekarang.getMonth() + 1;
  const tahun = sekarang.getFullYear();
  if (bulan >= 8) return { tahunAwal: tahun, jenis: "ganjil" as const };
  if (bulan === 1) return { tahunAwal: tahun - 1, jenis: "ganjil" as const };
  return { tahunAwal: tahun - 1, jenis: "genap" as const };
}

function daftarSemester(sekarang: Date, jumlah: number) {
  const hasil: { value: string; label: string }[] = [];
  let { tahunAwal, jenis } = semesterSaatIni(sekarang);
  for (let i = 0; i < jumlah; i++) {
    hasil.push({
      value: `${tahunAwal}-${jenis}`,
      label: `${jenis === "ganjil" ? "Ganjil" : "Genap"} ${tahunAwal}/${tahunAwal + 1}`,
    });
    if (jenis === "genap") jenis = "ganjil";
    else {
      jenis = "genap";
      tahunAwal -= 1;
    }
  }
  return hasil;
}

function rentangSemester(nilai: string) {
  const [tahun, jenis] = nilai.split("-");
  const tahunAwal = Number(tahun);
  return jenis === "ganjil"
    ? { dari: new Date(tahunAwal, 7, 1), sampai: new Date(tahunAwal + 1, 0, 31) }
    : { dari: new Date(tahunAwal + 1, 1, 1), sampai: new Date(tahunAwal + 1, 6, 31) };
}

function formatTanggalIso(iso: string) {
  const [tahun, bulan, hari] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(tahun, bulan - 1, hari));
}

function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatWaktu(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function KosongInfo({ teks }: { teks: string }) {
  return (
    <p className="rounded-xl bg-[#f5f8fb] px-4 py-8 text-center text-sm text-[#71839c]">
      {teks}
    </p>
  );
}

function GrafikTren({ tren }: { tren: DashboardMonitoringData["tren"] }) {
  const L = 640;
  const T = 220;
  const pad = { kiri: 32, kanan: 12, atas: 16, bawah: 28 };
  const lebar = L - pad.kiri - pad.kanan;
  const tinggi = T - pad.atas - pad.bawah;
  const maks = Math.max(4, ...tren.data.map((d) => d.jumlah));
  const skalaMaks = Math.ceil(maks / 4) * 4;
  const n = tren.data.length;
  const langkahLabel = Math.max(1, Math.ceil(n / 8));

  const titik = tren.data.map((d, i) => ({
    ...d,
    x: pad.kiri + (n === 1 ? lebar / 2 : (i / (n - 1)) * lebar),
    y: pad.atas + tinggi - (d.jumlah / skalaMaks) * tinggi,
  }));
  const garis = titik.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${garis} L${titik[n - 1].x},${pad.atas + tinggi} L${titik[0].x},${pad.atas + tinggi} Z`;
  const total = tren.data.reduce((t, d) => t + d.jumlah, 0);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-[#71839c]">
        <span className="h-2 w-2 rounded-full bg-[#107b73]" />
        Jumlah laporan per {tren.satuan} · total {total}
      </div>
      <svg viewBox={`0 0 ${L} ${T}`} className="h-auto w-full" role="img" aria-label="Grafik tren laporan">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = pad.atas + (tinggi / 4) * i;
          return (
            <g key={i}>
              <line x1={pad.kiri} x2={L - pad.kanan} y1={y} y2={y} stroke="#eef3f7" />
              <text x={pad.kiri - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                {(skalaMaks / 4) * (4 - i)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="#107b73" fillOpacity="0.08" />
        <path d={garis} fill="none" stroke="#107b73" strokeWidth="2.5" strokeLinejoin="round" />
        {titik.map((p, i) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r={n > 40 ? 2.5 : 4} fill="white" stroke="#107b73" strokeWidth="2">
              <title>{`${p.label}: ${p.jumlah} laporan`}</title>
            </circle>
            {i % langkahLabel === 0 && (
              <text x={p.x} y={T - 8} textAnchor="middle" fontSize="11" fill="#71839c">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function DistribusiDonat({ distribusi }: { distribusi: DashboardMonitoringData["distribusi"] }) {
  const [tab, setTab] = useState<TabDistribusi>("status");
  const sumber = distribusi[tab];
  const total = sumber.reduce((t, d) => t + d.jumlah, 0);

  const irisan =
    sumber.length > MAKS_IRISAN
      ? [
          ...sumber.slice(0, MAKS_IRISAN - 1),
          {
            nama: "Lainnya",
            jumlah: sumber.slice(MAKS_IRISAN - 1).reduce((t, d) => t + d.jumlah, 0),
          },
        ]
      : sumber;

  const r = 42;
  const keliling = 2 * Math.PI * r;
  const panjangIrisan = irisan.map((d) => (d.jumlah / total) * keliling);
  const awalIrisan = panjangIrisan.map((_, i) =>
    panjangIrisan.slice(0, i).reduce((t, p) => t + p, 0)
  );

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-[#f0f4f8] p-1" role="tablist">
        {(["status", "kategori", "lokasi"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
              tab === t ? "bg-white text-[#107b73] shadow-sm" : "text-[#60748b] hover:text-[#193652]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <KosongInfo teks="Belum ada laporan pada periode ini." />
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={r} fill="none" stroke="#eef3f7" strokeWidth="12" />
              {irisan.map((d, i) => (
                <circle
                  key={d.nama}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={WARNA_DONAT[i % WARNA_DONAT.length]}
                  strokeWidth="12"
                  strokeDasharray={`${panjangIrisan[i]} ${keliling - panjangIrisan[i]}`}
                  strokeDashoffset={-awalIrisan[i]}
                >
                  <title>{`${d.nama}: ${d.jumlah}`}</title>
                </circle>
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#193652]">{total}</span>
              <span className="text-[11px] text-[#71839c]">Total</span>
            </div>
          </div>
          <ul className="w-full min-w-0 space-y-2">
            {irisan.map((d, i) => (
              <li key={d.nama} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: WARNA_DONAT[i % WARNA_DONAT.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-[#52677f]" title={d.nama}>
                  {d.nama}
                </span>
                <span className="font-bold text-[#193652]">{d.jumlah}</span>
                <span className="w-9 text-right text-xs text-[#71839c]">
                  {Math.round((d.jumlah / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DashboardMonitoring({ satgas }: { satgas: SatgasInfo }) {
  const sekarang = useMemo(() => new Date(), []);
  const opsiSemester = useMemo(() => daftarSemester(sekarang, 6), [sekarang]);
  const opsiTahun = useMemo(
    () => Array.from({ length: 5 }, (_, i) => sekarang.getFullYear() - i),
    [sekarang]
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jenisPeriode, setJenisPeriode] = useState<JenisPeriode>("bulanan");
  const [bulan, setBulan] = useState(formatIso(sekarang).slice(0, 7));
  const [semester, setSemester] = useState(opsiSemester[0].value);
  const [tahun, setTahun] = useState(String(sekarang.getFullYear()));
  const [rentangDari, setRentangDari] = useState(
    formatIso(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1))
  );
  const [rentangSampai, setRentangSampai] = useState(formatIso(sekarang));

  const [data, setData] = useState<DashboardMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [muatUlang, setMuatUlang] = useState(0);

  const periode = useMemo(() => {
    if (jenisPeriode === "bulanan") {
      const [t, b] = bulan.split("-").map(Number);
      if (!t || !b) return null;
      return { dari: formatIso(new Date(t, b - 1, 1)), sampai: formatIso(new Date(t, b, 0)) };
    }
    if (jenisPeriode === "semester") {
      const r = rentangSemester(semester);
      return { dari: formatIso(r.dari), sampai: formatIso(r.sampai) };
    }
    if (jenisPeriode === "tahunan") {
      return { dari: `${tahun}-01-01`, sampai: `${tahun}-12-31` };
    }
    if (!rentangDari || !rentangSampai || rentangDari > rentangSampai) return null;
    return { dari: rentangDari, sampai: rentangSampai };
  }, [jenisPeriode, bulan, semester, tahun, rentangDari, rentangSampai]);

  useEffect(() => {
    if (!periode) return;
    const controller = new AbortController();

    async function ambilData() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams(periode!).toString();
        const response = await fetch(`/api/satgas-ppks/dashboard?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const hasil = await response.json();
        if (!response.ok || !hasil.success) {
          throw new Error(hasil.message ?? "Data dashboard tidak dapat dimuat.");
        }
        setData(hasil.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Data dashboard tidak dapat dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    ambilData();
    return () => controller.abort();
  }, [periode, muatUlang]);

  const segarkan = () => setMuatUlang((n) => n + 1);
  const namaDepan = satgas.name.split(" ")[0];
  const kontrolInput =
    "rounded-xl border border-[#dce7ed] bg-white px-3 py-2 text-sm text-[#193652] outline-none focus:border-[#107b73]";

  const kartu = data
    ? (() => {
        const r = data.ringkasan;
        const selisih = r.masuk - r.masukPeriodeSebelumnya;
        return [
          {
            label: "Laporan Masuk",
            nilai: r.masuk,
            keterangan: `${selisih >= 0 ? "+" : ""}${selisih} dari periode sebelumnya`,
            icon: FileText,
            ikon: "bg-[#e7f5f2] text-[#107b73]",
          },
          {
            label: "Perlu Diverifikasi",
            nilai: r.perluVerifikasi,
            keterangan: `${r.perluVerifikasiUrgensiTinggi} berurgensi tinggi`,
            icon: Clock,
            ikon: "bg-[#fff7ed] text-[#d97706]",
          },
          {
            label: "Sedang Ditangani",
            nilai: r.sedangDitangani,
            keterangan: `${r.diverifikasi} diverifikasi · ${r.ditangani} ditangani`,
            icon: Search,
            ikon: "bg-[#eff6ff] text-[#2563eb]",
          },
          {
            label: "Laporan Selesai",
            nilai: r.selesai,
            keterangan: `${r.masuk ? Math.round((r.selesai / r.masuk) * 100) : 0}% dari total laporan`,
            icon: CheckCircle,
            ikon: "bg-[#f0fdf4] text-[#16a34a]",
          },
        ];
      })()
    : [];

  return (
    <div className="flex min-h-screen bg-[#f5f8fb]" style={{ fontFamily: "'Inter', 'Geist', Arial, sans-serif" }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#0f2133] text-white
          transition-transform duration-300
          ${sidebarOpen ? "flex translate-x-0" : "hidden -translate-x-full lg:flex lg:translate-x-0"}
          lg:relative lg:inset-auto lg:z-auto lg:flex lg:translate-x-0
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

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-sm font-bold text-white">
              {satgas.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{satgas.name}</p>
              <p className="text-[11px] text-white/50">Petugas Satgas PPKS</p>
            </div>
            <button
              type="button"
              title="Keluar"
              aria-label="Keluar"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
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
              <span>SAFE SPACE</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#107b73]">DASHBOARD</span>
            </nav>
            <p className="truncate text-base font-bold text-[#193652]">Dashboard Monitoring PPKS</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/satgas-ppks/incident-alert"
              aria-label="Incident Alert"
              className="relative rounded-xl border border-[#e5edf2] bg-white p-2 text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73]"
            >
              <Bell className="h-5 w-5" />
              {data && data.incidentAlert.some((a) => a.statusVerifikasi === "PENDING") && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </Link>
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

        <div className="flex-1 space-y-6 px-5 py-6 sm:px-8 lg:px-10">
          {/* Sapaan + filter periode */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#193652]">Selamat datang, {namaDepan}</h1>
              <p className="mt-1 text-sm text-[#71839c]">
                Pantau laporan dan aktivitas penanganan kasus dalam satu tempat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={jenisPeriode}
                onChange={(e) => setJenisPeriode(e.target.value as JenisPeriode)}
                aria-label="Jenis periode"
                className={kontrolInput}
              >
                {PILIHAN_PERIODE.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {jenisPeriode === "bulanan" && (
                <input
                  type="month"
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  aria-label="Pilih bulan"
                  className={kontrolInput}
                />
              )}
              {jenisPeriode === "semester" && (
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  aria-label="Pilih semester"
                  className={kontrolInput}
                >
                  {opsiSemester.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}
              {jenisPeriode === "tahunan" && (
                <select
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                  aria-label="Pilih tahun"
                  className={kontrolInput}
                >
                  {opsiTahun.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
              {jenisPeriode === "rentang" && (
                <>
                  <input
                    type="date"
                    value={rentangDari}
                    max={rentangSampai || undefined}
                    onChange={(e) => setRentangDari(e.target.value)}
                    aria-label="Tanggal mulai"
                    className={kontrolInput}
                  />
                  <span className="text-sm text-[#71839c]">s/d</span>
                  <input
                    type="date"
                    value={rentangSampai}
                    min={rentangDari || undefined}
                    onChange={(e) => setRentangSampai(e.target.value)}
                    aria-label="Tanggal akhir"
                    className={kontrolInput}
                  />
                </>
              )}
              <button
                type="button"
                onClick={segarkan}
                disabled={loading}
                title="Perbarui data"
                aria-label="Perbarui data"
                className="rounded-xl border border-[#dce7ed] bg-white p-2.5 text-[#52677f] transition hover:border-[#107b73] hover:text-[#107b73] disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <p className="-mt-3 text-xs text-[#71839c]">
            {periode
              ? <>Periode: <span className="font-semibold text-[#193652]">{formatTanggalIso(periode.dari)} – {formatTanggalIso(periode.sampai)}</span></>
              : "Tanggal mulai tidak boleh setelah tanggal akhir."}
          </p>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
                <button
                  type="button"
                  onClick={segarkan}
                  className="mt-1 text-xs font-semibold text-[#dc2626] underline"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {!data && loading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          )}

          {data && (
            <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {data.dummy && (
                <div className="flex items-start gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Menampilkan data dummy untuk pratinjau, bukan data dari database.
                </div>
              )}

              {/* Kartu ringkasan */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kartu.map((k) => (
                  <div key={k.label} className="rounded-2xl border border-[#e5edf2] bg-white p-5">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.ikon}`}>
                        <k.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-[#52677f]">{k.label}</p>
                        <p className="mt-1 text-3xl font-black text-[#193652]">{k.nilai}</p>
                        <p className="mt-1 text-xs text-[#71839c]">{k.keterangan}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tren + distribusi */}
              <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border border-[#e5edf2] bg-white p-5 lg:col-span-2">
                  <h2 className="text-base font-bold text-[#193652]">Tren laporan kasus</h2>
                  <p className="mb-4 mt-0.5 text-xs text-[#71839c]">
                    Jumlah laporan yang diterima per {data.tren.satuan} pada periode terpilih.
                  </p>
                  {data.ringkasan.masuk === 0 ? (
                    <KosongInfo teks="Belum ada laporan pada periode ini." />
                  ) : (
                    <GrafikTren tren={data.tren} />
                  )}
                </section>

                <section className="rounded-2xl border border-[#e5edf2] bg-white p-5">
                  <h2 className="text-base font-bold text-[#193652]">Distribusi laporan</h2>
                  <p className="mb-4 mt-0.5 text-xs text-[#71839c]">
                    {data.ringkasan.masuk} laporan berdasarkan status, kategori, dan lokasi.
                  </p>
                  <DistribusiDonat distribusi={data.distribusi} />
                </section>
              </div>

              {/* Laporan terbaru */}
              <section className="rounded-2xl border border-[#e5edf2] bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[#193652]">Laporan kasus terbaru</h2>
                    <p className="mt-0.5 text-xs text-[#71839c]">5 laporan terakhir pada periode terpilih.</p>
                  </div>
                  <Link
                    href="/satgas-ppks/daftar-laporan"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7ed] px-3 py-2 text-xs font-semibold text-[#193652] transition hover:border-[#107b73] hover:text-[#107b73]"
                  >
                    Lihat Semua Laporan <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {data.laporanTerbaru.length === 0 ? (
                  <KosongInfo teks="Belum ada laporan pada periode ini." />
                ) : (
                  <div className="-mx-5 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-y border-[#eef3f7] text-[11px] font-semibold tracking-wide text-[#71839c]">
                          <th className="px-5 py-2.5">NOMOR KASUS</th>
                          <th className="px-3 py-2.5">KATEGORI</th>
                          <th className="px-3 py-2.5">TANGGAL LAPORAN</th>
                          <th className="px-3 py-2.5">LOKASI</th>
                          <th className="px-3 py-2.5">TINGKAT URGENSI</th>
                          <th className="px-5 py-2.5">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.laporanTerbaru.map((l) => {
                          const urgensi = URGENSI[l.tingkatUrgensi];
                          const status = STATUS_BADGE[l.status];
                          return (
                            <tr key={l.idLaporan} className="border-b border-[#f1f5f9] last:border-0">
                              <td className="px-5 py-3 font-bold text-[#193652]">#{l.nomorKasus}</td>
                              <td className="px-3 py-3 text-[#52677f]">{l.kategori}</td>
                              <td className="px-3 py-3 text-[#52677f]">{formatTanggal(l.createdAt)}</td>
                              <td className="px-3 py-3 text-[#52677f]">{l.lokasi}</td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${urgensi?.warna ?? "text-gray-500"}`}>
                                  <span className={`h-2 w-2 rounded-full ${urgensi?.titik ?? "bg-gray-400"}`} />
                                  {urgensi?.label ?? l.tingkatUrgensi}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status?.kelas ?? "border-gray-200 bg-gray-100 text-gray-600"}`}>
                                  {status?.label ?? l.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Incident alert + aktivitas */}
              <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border border-[#e5edf2] bg-white p-5 lg:col-span-2">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[#193652]">Incident Alert AI</h2>
                      <p className="mt-0.5 text-xs text-[#71839c]">Indikasi awal dari pemantauan CCTV.</p>
                    </div>
                    <Link
                      href="/satgas-ppks/incident-alert"
                      className="rounded-xl border border-[#dce7ed] px-3 py-2 text-xs font-semibold text-[#193652] transition hover:border-[#107b73] hover:text-[#107b73]"
                    >
                      Lihat Semua
                    </Link>
                  </div>
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-xs text-[#1e40af]">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Sistem AI menampilkan indikasi awal dan wajib diverifikasi oleh petugas. Hasil tidak menyatakan terjadinya kekerasan.
                  </div>

                  {data.incidentAlert.length === 0 ? (
                    <KosongInfo teks="Belum ada incident alert dari AI." />
                  ) : (
                    <ul className="space-y-3">
                      {data.incidentAlert.map((a) => {
                        const status = STATUS_ALERT[a.statusVerifikasi];
                        return (
                          <li
                            key={a.idIncident}
                            className={`flex flex-wrap items-center gap-4 rounded-xl border border-[#eef3f7] p-3 ${
                              a.statusVerifikasi === "PENDING" ? "border-l-4 border-l-[#f59e0b]" : ""
                            }`}
                          >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f0f4f8] text-[#71839c]">
                              <Video className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[#193652]">{a.kodeKamera}</p>
                              <p className="truncate text-xs text-[#71839c]">{a.lokasi}</p>
                              <span className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status?.kelas ?? ""}`}>
                                {status?.label ?? a.statusVerifikasi}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[#71839c]">{formatWaktu(a.waktuDeteksi)}</p>
                              <p className="mt-1 text-lg font-black text-[#193652]">
                                {Math.round(a.confidence * 100)}%
                              </p>
                              <p className="text-[10px] text-[#71839c]">keyakinan</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl border border-[#e5edf2] bg-white p-5">
                  <h2 className="text-base font-bold text-[#193652]">Aktivitas terbaru</h2>
                  <p className="mb-4 mt-0.5 text-xs text-[#71839c]">Pembaruan penanganan kasus.</p>

                  {data.aktivitasTerbaru.length === 0 ? (
                    <KosongInfo teks="Belum ada aktivitas penanganan." />
                  ) : (
                    <ul className="space-y-4">
                      {data.aktivitasTerbaru.map((r) => (
                        <li key={r.idRiwayat} className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e7f5f2] text-[#107b73]">
                            <History className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#193652]">{r.jenisAktivitas}</p>
                            <p className="text-xs text-[#52677f]">
                              Kasus {r.nomorKasus} · {r.petugas}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#94a3b8]">{formatWaktu(r.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/satgas-ppks/riwayat-penanganan"
                    className="mt-4 block rounded-xl border border-[#dce7ed] py-2 text-center text-xs font-semibold text-[#193652] transition hover:border-[#107b73] hover:text-[#107b73]"
                  >
                    Lihat Semua Aktivitas
                  </Link>
                </section>
              </div>

              <p className="text-right text-[11px] text-[#71839c]">
                Data diperbarui{" "}
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(data.diperbaruiPada))}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
