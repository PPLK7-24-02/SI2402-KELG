"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

type Category = { idKategori: string; nama: string };
type Location = { idLokasi: string; namaGedung: string; area: string };
type Attachment = { id: string; file: File; preview: string | null };
type InvolvedParty = { nama: string; peran: string };

type ReportFormProps = {
  categories: Category[];
  locations: Location[];
  reporterName: string;
  reporterType: string;
  preview?: boolean;
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const ACCEPTED_FORMATS =
  "JPG, PNG, WEBP, PDF, DOC, DOCX, MP3, WAV, OGG, M4A, MP4, WEBM, MOV";

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8m-8 4h8" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5m5-5v12" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    plus: <><path d="M12 5v14m-7-7h14" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    arrow: <><path d="m9 18 6-6-6-6" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
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
      {paths[name] ?? paths.file}
    </svg>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-[#34495c]">
      {children}
      {required && <span className="ml-1 text-[#d15e58]">*</span>}
    </label>
  );
}

function CardHeading({
  step,
  title,
  subtitle,
  icon,
}: {
  step: string;
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e7f5f2] text-[#087f73]">
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#07877b]">
          Langkah {step}
        </p>
        <h2 className="mt-0.5 text-base font-bold text-[#203c54]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#718092]">{subtitle}</p>
      </div>
    </div>
  );
}

function readImagePreview(file: File) {
  if (!file.type.startsWith("image/")) return Promise.resolve<string | null>(null);

  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ReportForm({
  categories,
  locations,
  reporterName,
  reporterType,
  preview = false,
}: ReportFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [parties, setParties] = useState<InvolvedParty[]>([{ nama: "", peran: "KORBAN" }]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [caseId, setCaseId] = useState("");
  const initials = reporterName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function addFiles(fileList: FileList | File[]) {
    const selected = Array.from(fileList);
    const remaining = MAX_FILES - attachments.length;
    const nextFiles = selected.slice(0, remaining);
    const rejected: string[] = [];

    if (selected.length > remaining) {
      rejected.push(`Maksimal ${MAX_FILES} lampiran.`);
    }

    const valid = nextFiles.filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejected.push(`${file.name}: tipe file tidak didukung.`);
        return false;
      }
      if (!file.size || file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: ukuran maksimal 20 MB.`);
        return false;
      }
      return true;
    });

    if (rejected.length) setError(rejected.join(" "));
    else setError("");

    const additions = await Promise.all(
      valid.map(async (file) => ({
        id: window.crypto.randomUUID(),
        file,
        preview: await readImagePreview(file),
      }))
    );
    setAttachments((current) => [...current, ...additions]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) void addFiles(event.currentTarget.files);
    event.currentTarget.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  function updateParty(index: number, field: keyof InvolvedParty, value: string) {
    setParties((current) =>
      current.map((party, partyIndex) =>
        partyIndex === index ? { ...party, [field]: value } : party
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const date = String(new FormData(form).get("tanggalKejadian") ?? "");
    const time = String(new FormData(form).get("waktuKejadian") ?? "");
    const normalizedParties = parties
      .filter((party) => party.nama.trim())
      .map((party) => ({ ...party, nama: party.nama.trim() }));

    if (!date || !time) {
      setFieldErrors({ waktuKejadian: "Tanggal dan waktu kejadian wajib diisi." });
      return;
    }

    if (!normalizedParties.length) {
      setFieldErrors({ pihakTerlibat: "Tambahkan setidaknya satu pihak yang terlibat." });
      return;
    }

    const payload = new FormData(form);
    payload.delete("tanggalKejadian");
    payload.set("waktuKejadian", new Date(`${date}T${time}`).toISOString());
    payload.set("isAnonim", String(isAnonymous));
    payload.set("pihakTerlibat", JSON.stringify(normalizedParties));
    attachments.forEach(({ file }) => payload.append("lampiran", file));

    setSubmitting(true);
    try {
      const response = await fetch("/api/laporan", { method: "POST", body: payload });
      const result = await response.json();

      if (!response.ok) {
        if (Array.isArray(result.errors)) {
          setFieldErrors(
            Object.fromEntries(
              result.errors.map((item: { field: string; message: string }) => [
                item.field,
                item.message,
              ])
            )
          );
        }
        setError(result.message ?? "Laporan belum berhasil dikirim.");
        return;
      }

      setCaseId(result.data.caseId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function startAnotherReport() {
    formRef.current?.reset();
    setCaseId("");
    setAttachments([]);
    setParties([{ nama: "", peran: "KORBAN" }]);
    setIsAnonymous(false);
    setError("");
    setFieldErrors({});
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f3f6f9] text-[#20384e] lg:flex">
      <aside className="flex w-full shrink-0 flex-col bg-[#183650] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[224px]">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
          <Link href="/laporan/buat" className="block">
            <span className="text-sm font-extrabold tracking-[0.12em]">SAFE SPACE</span>
            <span className="mt-0.5 block text-[10px] text-[#a9bbca]">Portal Pelapor</span>
          </Link>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#9de4d8] lg:hidden">
            <Icon name="user" />
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-8 lg:block lg:space-y-1 lg:px-3">
          <p className="hidden px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9aafbf] lg:block">
            Menu Pelapor
          </p>
          <a href="#" aria-disabled="true" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-[#c5d2dc] opacity-70 lg:w-full">
            <Icon name="home" /> Dashboard
          </a>
          <Link href="/laporan/buat" aria-current="page" className="flex shrink-0 items-center gap-3 rounded-lg bg-[#078779] px-3 py-2.5 text-xs font-semibold text-white shadow-sm lg:w-full">
            <Icon name="edit" /> Buat Laporan
          </Link>
          <a href="#" aria-disabled="true" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-[#c5d2dc] opacity-70 lg:w-full">
            <Icon name="alert" /> Emergency Report
          </a>
          <a href="#" aria-disabled="true" className="hidden items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-[#c5d2dc] opacity-70 lg:flex">
            <Icon name="search" /> Case Tracking
          </a>
          <a href="#" aria-disabled="true" className="hidden items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-[#c5d2dc] opacity-70 lg:flex">
            <Icon name="book" /> Edukasi
          </a>
        </nav>

        <div className="mt-auto hidden px-3 pb-4 lg:block">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-[#d6e5ec]">
              <Icon name="shield" className="h-4 w-4 text-[#8de1d6]" /> Data laporan bersifat sensitif
            </div>
            <p className="mt-1.5 text-[9px] leading-4 text-[#a9bbca]">
              Pastikan informasi yang diberikan relevan dan benar.
            </p>
          </div>
          <p className="pt-4 text-center text-[9px] text-[#8ea4b4]">SAFE SPACE · Portal Pelapor</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-[60px] items-center justify-between border-b border-[#e1e7ed] bg-white px-5 sm:px-8">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#078779]">
              Safe Space <span className="px-1 text-[#a8b5c1]">›</span> Buat Laporan
            </p>
            <h1 className="mt-0.5 text-sm font-bold text-[#20384e]">Buat Laporan</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button type="button" title="Notifikasi" className="relative grid h-9 w-9 place-items-center rounded-lg text-[#65788a] hover:bg-[#f1f5f7]">
              <Icon name="bell" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d16c62]" />
            </button>
            <span className="h-7 w-px bg-[#e5eaef]" />
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e4f3f0] text-[10px] font-bold text-[#087e73]">{initials}</span>
              <div className="hidden sm:block">
                <p className="max-w-[150px] truncate text-[11px] font-semibold text-[#243d52]">{reporterName}</p>
                <p className="text-[9px] text-[#8190a0]">{reporterType}</p>
              </div>
            </div>
          </div>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="mx-auto flex min-h-[calc(100vh-60px)] w-full max-w-[1320px] flex-col px-4 pb-24 sm:px-7 lg:px-9">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-4 pt-5 sm:pt-6">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#078779]">Pelaporan Kasus</p>
              <h2 className="mt-1 text-[22px] font-bold leading-tight text-[#20384e]">Buat Laporan</h2>
              <p className="mt-1.5 text-xs text-[#718092]">Gunakan formulir ini untuk menyampaikan kejadian kepada Satgas PPKS secara aman dan terarah.</p>
            </div>
            <Link href="/" className="mb-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#087f73] hover:text-[#075e57]">
              <span className="rotate-180"><Icon name="arrow" className="h-3.5 w-3.5" /></span>
              Kembali ke Dashboard
            </Link>
          </div>

          {preview && (
            <div className="mb-4 rounded-md border border-[#c9ded9] bg-[#f3f9f7] px-4 py-2.5 text-[10px] leading-4 text-[#58756d]">
              Mode pratinjau: data dan pengiriman dipakai untuk melihat tampilan UI. Login atau database tidak diperlukan.
            </div>
          )}

          {caseId ? (
            <section className="my-6 rounded-lg border border-[#b8e3d8] bg-white p-6 shadow-[0_3px_14px_rgba(27,54,76,0.05)] sm:p-9" role="status">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e3f5ef] text-[#078779]"><Icon name="check" className="h-6 w-6" /></span>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#078779]">Laporan Terkirim</p>
              <h2 className="mt-1 text-2xl font-bold text-[#20384e]">Terima kasih telah melapor.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#718092]">Laporanmu sudah diterima oleh Satgas PPKS. Simpan Case ID berikut untuk referensi.</p>
              <div className="mt-6 inline-flex min-h-12 items-center rounded-md border border-[#dce6ec] bg-[#f7fafb] px-4 font-mono text-sm font-semibold text-[#20384e]">{caseId}</div>
              <div className="mt-7">
                <button type="button" onClick={startAnotherReport} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#087f73] px-4 text-xs font-semibold text-white hover:bg-[#076b62]">
                  Buat laporan lain <Icon name="arrow" className="h-3.5 w-3.5" />
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="mb-4 flex gap-2.5 rounded-lg border border-[#cfe0fb] bg-[#f2f7ff] px-3.5 py-3 text-[#39597a] sm:px-4">
                <span className="mt-0.5 text-[#3977c4]"><Icon name="shield" className="h-4 w-4" /></span>
                <div>
                  <p className="text-[11px] font-semibold">Anda menggunakan akun terverifikasi</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-[#6e8198]">Setelah laporan dikirim, Anda dapat memilih untuk menyamarkan identitas dari tampilan laporan.</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-md border border-[#f1c8c3] bg-[#fff4f2] px-4 py-3 text-xs leading-5 text-[#a8433d]" role="alert">
                  {error}
                </div>
              )}

              <div className="grid flex-1 items-start gap-4 pb-24 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.86fr)]">
                <section className="rounded-lg border border-[#dfe6ec] bg-white p-4 shadow-[0_2px_10px_rgba(28,52,75,0.045)] sm:p-5">
                  <CardHeading step="1" title="Informasi Kejadian" subtitle="Lengkapi informasi utama mengenai kejadian yang ingin dilaporkan." icon="file" />

                  <div className="space-y-4">
                    <div>
                      <FieldLabel htmlFor="kategoriId" required>Kategori kasus</FieldLabel>
                      <select id="kategoriId" name="kategoriId" required defaultValue="" className="form-control">
                        <option value="" disabled>Pilih kategori kasus</option>
                        {categories.map((category) => <option key={category.idKategori} value={category.idKategori}>{category.nama}</option>)}
                      </select>
                      {categories.length === 0 && <p className="mt-1 text-[10px] text-[#b05c50]">Kategori belum tersedia. Hubungi administrator.</p>}
                      {fieldErrors.kategoriId && <p className="field-error">{fieldErrors.kategoriId}</p>}
                    </div>

                    <div>
                      <FieldLabel htmlFor="kronologi" required>Kronologi kejadian</FieldLabel>
                      <textarea id="kronologi" name="kronologi" required maxLength={20000} rows={5} placeholder="Ceritakan kejadian secara runtut, jelas, dan hanya sertakan informasi yang relevan..." className="form-control min-h-[132px] resize-y leading-5" />
                      <p className="mt-1 text-right text-[10px] text-[#8a98a6]">Maksimal 20.000 karakter</p>
                      {fieldErrors.kronologi && <p className="field-error">{fieldErrors.kronologi}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="tanggalKejadian" required>Tanggal kejadian</FieldLabel>
                        <div className="relative">
                          <input id="tanggalKejadian" name="tanggalKejadian" type="date" required className="form-control pr-9" />
                          <Icon name="calendar" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8190a0]" />
                        </div>
                      </div>
                      <div>
                        <FieldLabel htmlFor="waktuKejadian" required>Waktu kejadian</FieldLabel>
                        <div className="relative">
                          <input id="waktuKejadian" name="waktuKejadian" type="time" required className="form-control pr-9" />
                          <Icon name="clock" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8190a0]" />
                        </div>
                        {fieldErrors.waktuKejadian && <p className="field-error">{fieldErrors.waktuKejadian}</p>}
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="lokasiId" required>Area kampus</FieldLabel>
                      <select id="lokasiId" name="lokasiId" required defaultValue="" className="form-control">
                        <option value="" disabled>Pilih gedung atau area</option>
                        {locations.map((location) => <option key={location.idLokasi} value={location.idLokasi}>{location.namaGedung} · {location.area}</option>)}
                      </select>
                      {locations.length === 0 && <p className="mt-1 text-[10px] text-[#b05c50]">Lokasi belum tersedia. Hubungi administrator.</p>}
                    </div>
                    <div>
                      <FieldLabel htmlFor="detailLokasi" required>Detail lokasi kejadian</FieldLabel>
                      <input id="detailLokasi" name="detailLokasi" required maxLength={5000} placeholder="Contoh: ruang kelas, koridor lantai 2, atau titik lokasi lainnya" className="form-control" />
                      {fieldErrors.detailLokasi && <p className="field-error">{fieldErrors.detailLokasi}</p>}
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <FieldLabel htmlFor="party-0-nama" required>Pihak yang terlibat</FieldLabel>
                        <button type="button" onClick={() => setParties((current) => [...current, { nama: "", peran: "SAKSI" }])} disabled={parties.length >= 20} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#dce7e9] px-2.5 text-[10px] font-semibold text-[#087f73] hover:bg-[#f1f8f6] disabled:opacity-40">
                          <Icon name="plus" className="h-3 w-3" /> Tambah pihak
                        </button>
                      </div>
                      <p className="mb-2 text-[10px] text-[#8190a0]">Isi pihak yang relevan. Nama dapat disamarkan pada laporan anonim.</p>
                      <div className="space-y-2">
                        {parties.map((party, index) => (
                          <div key={index} className="grid grid-cols-[minmax(0,1fr)_112px_32px] gap-2">
                            <input id={`party-${index}-nama`} value={party.nama} onChange={(event) => updateParty(index, "nama", event.target.value)} maxLength={150} placeholder="Nama atau keterangan pihak" className="form-control" aria-label={`Nama pihak ${index + 1}`} />
                            <select value={party.peran} onChange={(event) => updateParty(index, "peran", event.target.value)} className="form-control px-2" aria-label={`Peran pihak ${index + 1}`}>
                              <option value="KORBAN">Korban</option>
                              <option value="PELAKU">Terlapor</option>
                              <option value="SAKSI">Saksi</option>
                              <option value="LAINNYA">Lainnya</option>
                            </select>
                            <button type="button" title="Hapus pihak" onClick={() => setParties((current) => current.filter((_, partyIndex) => partyIndex !== index))} disabled={parties.length === 1} className="grid h-10 w-8 place-items-center rounded-md text-[#8997a4] hover:bg-[#fff1ef] hover:text-[#bb5b50] disabled:opacity-30">
                              <Icon name="close" className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {fieldErrors.pihakTerlibat && <p className="field-error">{fieldErrors.pihakTerlibat}</p>}
                    </div>

                    <div>
                      <FieldLabel htmlFor="keteranganTambahan">Keterangan tambahan</FieldLabel>
                      <textarea id="keteranganTambahan" name="keteranganTambahan" maxLength={10000} rows={3} placeholder="Informasi lain yang dapat membantu penanganan laporan (opsional)" className="form-control resize-y leading-5" />
                    </div>
                  </div>
                </section>

                <div className="space-y-4">
                  <section className="rounded-lg border border-[#dfe6ec] bg-white p-4 shadow-[0_2px_10px_rgba(28,52,75,0.045)] sm:p-5">
                    <CardHeading step="2" title="Bukti Pendukung" subtitle="Lampirkan bukti yang relevan bila tersedia." icon="upload" />
                    <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES.join(",")} onChange={handleFileChange} className="sr-only" aria-label="Pilih file bukti" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }} className={`flex min-h-[134px] w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${dragging ? "border-[#078779] bg-[#edf8f5]" : "border-[#cfdbe4] bg-[#fbfcfd] hover:border-[#75b9ad] hover:bg-[#f8fcfb]"}`}>
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f5f2] text-[#078779]"><Icon name="upload" className="h-[18px] w-[18px]" /></span>
                      <span className="mt-2.5 text-[11px] font-semibold text-[#30495e]">Pilih file atau seret bukti ke sini</span>
                      <span className="mt-1 text-[9px] leading-4 text-[#8492a0]">{ACCEPTED_FORMATS}<br />Maks. 5 file, 20 MB per file</span>
                    </button>
                    <p className="mt-3 rounded-md bg-[#f4f7f9] px-3 py-2 text-[9px] leading-4 text-[#82909d]">Lampiran hanya dapat diakses oleh pelapor dan petugas Satgas PPKS yang berwenang.</p>

                    {attachments.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {attachments.map((item) => (
                          <li key={item.id} className="flex min-w-0 items-center gap-2.5 rounded-md border border-[#e3e9ee] p-2">
                            {item.preview ? <img src={item.preview} alt={`Pratinjau ${item.file.name}`} className="h-10 w-10 shrink-0 rounded object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[#eff4f6] text-[#5b788b]"><Icon name="file" /></span>}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[10px] font-semibold text-[#30495e]">{item.file.name}</span>
                              <span className="mt-0.5 block text-[9px] text-[#8b98a4]">{formatBytes(item.file.size)}</span>
                            </span>
                            <button type="button" title={`Hapus ${item.file.name}`} onClick={() => removeAttachment(item.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded text-[#8997a4] hover:bg-[#fff1ef] hover:text-[#bb5b50]">
                              <Icon name="close" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-lg border border-[#dfe6ec] bg-white p-4 shadow-[0_2px_10px_rgba(28,52,75,0.045)] sm:p-5">
                    <CardHeading step="3" title="Identitas Pelapor" subtitle="Pilih visibilitas identitas pada laporan." icon="user" />
                    <fieldset className="space-y-2">
                      <legend className="sr-only">Pengaturan identitas</legend>
                      <label className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${!isAnonymous ? "border-[#9ed2c9] bg-[#eef8f6]" : "border-[#e4e9ed] hover:bg-[#fafcfc]"}`}>
                        <input type="radio" name="privasi" checked={!isAnonymous} onChange={() => setIsAnonymous(false)} className="mt-0.5 accent-[#087f73]" />
                        <span><span className="block text-[10px] font-semibold text-[#30495e]">Tampilkan identitas</span><span className="mt-1 block text-[9px] leading-4 text-[#85929e]">Identitas akan diketahui untuk komunikasi penanganan.</span></span>
                      </label>
                      <label className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${isAnonymous ? "border-[#9ed2c9] bg-[#eef8f6]" : "border-[#e4e9ed] hover:bg-[#fafcfc]"}`}>
                        <input type="radio" name="privasi" checked={isAnonymous} onChange={() => setIsAnonymous(true)} className="mt-0.5 accent-[#087f73]" />
                        <span><span className="block text-[10px] font-semibold text-[#30495e]">Laporkan secara anonim</span><span className="mt-1 block text-[9px] leading-4 text-[#85929e]">Identitas tidak ditampilkan pada informasi laporan.</span></span>
                      </label>
                    </fieldset>
                    <div className="mt-3 flex gap-2 rounded-md bg-[#f7f9fa] p-3">
                      <span className="mt-0.5 text-[#078779]"><Icon name="shield" className="h-3.5 w-3.5" /></span>
                      <p className="text-[9px] leading-4 text-[#758493]"><span className="font-semibold text-[#53697d]">Privasi informasi terjaga</span><br />{isAnonymous ? "Identitas akun tetap terlindungi dari tampilan laporan." : "Informasi identitas hanya digunakan untuk keperluan penanganan."}</p>
                    </div>
                  </section>
                </div>
              </div>

              <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#dfe6ec] bg-white/95 px-4 py-3 backdrop-blur sm:px-7 lg:left-[224px] lg:px-9">
                <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3">
                  <p className="hidden items-center gap-2 text-[10px] leading-4 text-[#7b8996] sm:flex">
                    <Icon name="shield" className="h-4 w-4 shrink-0 text-[#078779]" />
                    Periksa kembali informasi sebelum mengirim. Data laporan bersifat rahasia.
                  </p>
                  <div className="ml-auto flex w-full gap-2 sm:w-auto">
                    <Link href="/" className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-[#dce4ea] px-4 text-xs font-semibold text-[#536779] hover:bg-[#f6f8f9] sm:flex-none">Batalkan</Link>
                    <button type="submit" disabled={preview || submitting || !categories.length || !locations.length} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[#078779] px-4 text-xs font-semibold text-white hover:bg-[#076b62] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none">
                      <Icon name="send" className="h-3.5 w-3.5" /> {preview ? "Mode Pratinjau" : submitting ? "Mengirim..." : "Kirim Laporan"}
                    </button>
                  </div>
                </div>
              </footer>
            </>
          )}
        </form>
      </div>
    </main>
  );
}