"use client";

import Link from "next/link";
import { getSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";

import {
  BarChart2,
  Bell,
  BookOpen,
  CheckCircle,
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
} from "../../../components/icons";

const KATEGORI = [
  "Pemahaman Dasar",
  "Pencegahan",
  "Hak dan Privasi",
  "Panduan Tindakan",
  "Panduan Pelaporan",
] as const;

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

type StatusMateri = "DRAFT" | "PUBLISHED";

type MateriEdukasi = {
  idEdukasi: string;
  judul: string;
  kategori: string;
  isi: string;
  status: StatusMateri;
  mediaUrl: string | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: MateriEdukasi;
};

const MAX_MEDIA_SIZE = 10 * 1024 * 1024;
const MEDIA_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4m0 0L8 8m4-4 4 4" />
      <path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5m4-5v5" />
    </svg>
  );
}

function validasiMedia(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!Object.hasOwn(MEDIA_TYPES, extension) || MEDIA_TYPES[extension] !== file.type) {
    return "Format file harus JPG, JPEG, PNG, PDF, DOC, atau DOCX.";
  }
  if (file.size > MAX_MEDIA_SIZE) return "Ukuran file maksimal 10 MB.";
  if (file.size === 0) return "File tidak boleh kosong.";
  return null;
}

export default function EditMateriPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [satgasName, setSatgasName] = useState<string | null>(null);
  const [satgasInitials, setSatgasInitials] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<{
    id: string;
    materi?: MateriEdukasi;
    error?: string;
  } | null>(null);
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState<(typeof KATEGORI)[number] | "">("");
  const [isi, setIsi] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);
  const [status, setStatus] = useState<StatusMateri>("DRAFT");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getSession()
      .then((session) => {
        if (!active || !session?.user) return;
        const name = session.user.name?.trim();
        if (!name) return;
        setSatgasName(name);
        setSatgasInitials(
          name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase() || "SP"
        );
      })
      .catch((error: unknown) => {
        console.error("[EDIT_MATERI_EDUKASI] Gagal mengambil session pengguna:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/satgas-ppks/manajemen-edukasi?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: ApiResponse = await response.json();
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Materi edukasi gagal dimuat.");
        }
        if (result.data.idEdukasi !== id) {
          throw new Error("Data materi yang diterima tidak sesuai dengan ID yang diminta.");
        }
        const validKategori = KATEGORI.find((item) => item === result.data?.kategori);
        if (!validKategori) {
          throw new Error("Kategori materi yang diterima tidak valid.");
        }
        if (result.data.status !== "DRAFT" && result.data.status !== "PUBLISHED") {
          throw new Error("Status publikasi materi yang diterima tidak valid.");
        }
        if (controller.signal.aborted) return;
        setMedia(null);
        setRemoveExistingMedia(false);
        setMediaError("");
        setSubmitError("");
        setSuccessMessage("");
        setJudul(result.data.judul);
        setKategori(validKategori);
        setIsi(result.data.isi);
        setStatus(result.data.status);
        setLoadState({ id, materi: result.data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          id,
          error:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat mengambil materi edukasi.",
        });
      });
    return () => {
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(
      () => router.push("/satgas-ppks/manajemen-edukasi"),
      900
    );
    return () => window.clearTimeout(timeout);
  }, [router, successMessage]);

  const onFileSelected = useCallback((file: File | undefined) => {
    if (!file) return;
    const error = validasiMedia(file);
    if (error) {
      setMediaError(error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setMediaError("");
    setMedia(file);
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileSelected(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFileSelected(event.dataTransfer.files[0]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    if (!judul.trim() || !kategori || !isi.trim()) {
      setSubmitError("Judul, kategori, dan isi materi wajib diisi.");
      return;
    }
    if (media) {
      const error = validasiMedia(media);
      if (error) {
        setMediaError(error);
        return;
      }
    }
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setConfirmOpen(false);
    setSubmitError("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("idEdukasi", id);
    formData.set("judul", judul.trim());
    formData.set("kategori", kategori);
    formData.set("isi", isi.trim());
    formData.set("status", status);
    if (media) formData.set("media", media);
    if (removeExistingMedia && !media) formData.set("hapusMedia", "true");

    try {
      const response = await fetch("/api/satgas-ppks/manajemen-edukasi", {
        method: "PUT",
        body: formData,
      });
      const result: ApiResponse = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Perubahan materi edukasi gagal disimpan.");
      }
      setSuccessMessage(result.message ?? "Materi edukasi berhasil diperbarui.");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan perubahan materi edukasi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = loadState?.id !== id;
  const materi = loadState?.id === id ? loadState.materi ?? null : null;
  const loadError = loadState?.id === id ? loadState.error ?? "" : "";
  const mediaFileName = materi?.mediaUrl
    ? ((materi.mediaUrl.split(/[?#]/, 1)[0] ?? "").split("/").pop() ?? "")
    : "";

  return (
    <div
      className="flex min-h-screen bg-[#f5f8fb] text-[#193652]"
      style={{ fontFamily: "'Inter', 'Geist', Arial, sans-serif" }} >
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#0f2133] text-white transition-transform duration-300 ${
          sidebarOpen ? "flex translate-x-0" : "hidden -translate-x-full lg:flex lg:translate-x-0"
        } lg:relative lg:inset-auto lg:z-auto lg:flex lg:translate-x-0`} >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#107b73] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-black tracking-wider">SAFE SPACE</p>
            <p className="text-[10px] text-white/50">Satgas PPKS</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup navigasi" >
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
                  }`} >
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
            type="button"
            className="rounded-lg p-2 text-[#193652] hover:bg-[#f0f4f8] lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka navigasi">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <nav
              className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#71839c]"
              aria-label="Breadcrumb">
              <Link href="/satgas-ppks" className="hover:text-[#107b73]">SAFE SPACE</Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/satgas-ppks/manajemen-edukasi" className="hover:text-[#107b73]">
                MANAJEMEN EDUKASI
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate text-[#107b73]">EDIT MATERI</span>
            </nav>
            <p className="truncate text-base font-bold text-[#193652]">
              Manajemen Konten Edukasi
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative rounded-xl border border-[#e5edf2] bg-white p-2 text-[#60748b] transition hover:border-[#107b73] hover:text-[#107b73]">
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

        <div className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-8 lg:px-9">
          <section className="mb-5">
            <h1 className="text-[22px] font-bold tracking-tight text-[#193652] sm:text-[24px]">
              Edit Materi Edukasi
            </h1>
            <p className="mt-1.5 text-xs text-[#71839c]">
              Perbarui informasi materi edukasi SAFE SPACE.
            </p>
          </section>

          {loading && (
            <section
              className="rounded-xl border border-[#dce4ea] bg-white px-5 py-16 text-center text-sm text-[#71839c] shadow-sm"
              role="status">
              Memuat materi edukasi...
            </section>
          )}

          {!loading && loadError && (
            <section
              className="rounded-xl border border-red-200 bg-white px-5 py-12 text-center shadow-sm"
              role="alert">
              <p className="text-sm font-semibold text-red-700">{loadError}</p>
              <Link
                href="/satgas-ppks/manajemen-edukasi"
                className="mt-4 inline-flex rounded-lg bg-[#107b73] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b6a63]">
                Kembali ke Manajemen Edukasi
              </Link>
            </section>
          )}

          {!loading && !loadError && materi && (
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-xl border border-[#dce6ed] bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e5edf2] px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f5f3] text-[#0e9b90]">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#193652]">Informasi Materi</h2>
                  <p className="mt-0.5 text-[10px] text-[#8b9bb0]">
                    Perbarui informasi materi edukasi berikut.
                  </p>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4 sm:px-6">
                <div>
                  <label htmlFor="judul" className="mb-1.5 block text-[11px] font-semibold text-[#193652]">
                    Judul Materi <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="judul"
                    name="judul"
                    required
                    maxLength={255}
                    value={judul}
                    onChange={(event) => setJudul(event.target.value)}
                    className="h-10 w-full rounded-md border border-[#cbd9e4] px-3 text-xs text-[#193652] outline-none transition focus:border-[#0e9b90] focus:ring-2 focus:ring-[#0e9b90]/10"
                  />
                </div>

                <div>
                  <label htmlFor="kategori" className="mb-1.5 block text-[11px] font-semibold text-[#193652]">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="kategori"
                    name="kategori"
                    required
                    value={kategori}
                    onChange={(event) =>
                      setKategori(KATEGORI.find((pilihan) => pilihan === event.target.value) ?? "")
                    }
                    className="h-10 w-full rounded-md border border-[#cbd9e4] bg-white px-3 text-xs text-[#193652] outline-none transition focus:border-[#0e9b90] focus:ring-2 focus:ring-[#0e9b90]/10">
                    {KATEGORI.map((pilihan) => (
                      <option key={pilihan} value={pilihan}>{pilihan}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="isi" className="mb-1.5 block text-[11px] font-semibold text-[#193652]">
                    Isi Materi / Deskripsi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="isi"
                    name="isi"
                    required
                    value={isi}
                    onChange={(event) => setIsi(event.target.value)}
                    rows={5}
                    className="min-h-32 w-full resize-y rounded-md border border-[#cbd9e4] px-3 py-3 text-xs leading-5 text-[#193652] outline-none transition focus:border-[#0e9b90] focus:ring-2 focus:ring-[#0e9b90]/10"/>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#9aa9b8]">
                    <span>Gunakan bahasa yang jelas dan mudah dipahami.</span>
                    <span>{isi.length} karakter</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#193652]">
                    Media Pendukung <span className="font-normal text-[#8b9bb0]">(Opsional)</span>
                  </label>
                  <p className="mt-1 text-[10px] text-[#8b9bb0]">
                    Media saat ini dipertahankan kecuali Anda mengganti atau menghapusnya.
                  </p>
                  {materi.mediaUrl && !media && !removeExistingMedia && (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-[#dce6ed] bg-[#fbfdff] px-3 py-2">
                      <p className="min-w-0 break-all text-[11px] text-[#52677e]">
                        Media saat ini:{" "}
                        <a
                          href={materi.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#107b73] hover:text-[#075e57]"
                        >
                          {mediaFileName || "Lihat media"}
                        </a>
                      </p>
                      <button
                        type="button"
                        onClick={() => setRemoveExistingMedia(true)}
                        aria-label="Hapus media pendukung"
                        title="Hapus media pendukung"
                        className="shrink-0 rounded-md p-2 text-red-600 transition hover:bg-red-50">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {removeExistingMedia && !media && (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-[11px] text-red-700">Media pendukung akan dihapus saat perubahan disimpan.</p>
                      <button
                        type="button"
                        onClick={() => setRemoveExistingMedia(false)}
                        className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-[#52677e] hover:bg-white">
                        Batalkan Hapus
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    className="sr-only"
                    onChange={handleFileChange}
                    aria-label="Pilih media pendukung"/>
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`mt-2 flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-4 text-center transition ${
                      dragging ? "border-[#0e9b90] bg-[#f0fbf9]" : "border-[#a9c5d8] bg-[#fbfdff]"
                    }`}>
                    {media ? (
                      <>
                        <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#e5f6f3] text-[#0e9b90]">
                          <FileText className="h-4 w-4" />
                        </span>
                        <p className="max-w-full truncate text-xs font-semibold text-[#193652]">{media.name}</p>
                        <p className="mt-1 text-[10px] text-[#8b9bb0]">
                          {(media.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-md border border-[#0e9b90] px-3 py-1.5 text-[10px] font-semibold text-[#0e9b90] hover:bg-[#effaf8]">
                            Ganti File
                          </button>
                          {materi.mediaUrl && !removeExistingMedia && (
                            <button
                              type="button"
                              onClick={() => {
                                setMedia(null);
                                setMediaError("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="rounded-md border border-[#d7e1e9] px-3 py-1.5 text-[10px] font-semibold text-[#687d91] hover:bg-[#f5f8fb]">
                              Gunakan Media Lama
                            </button>
                          )}
                          {(!materi.mediaUrl || removeExistingMedia) && (
                            <button
                              type="button"
                              onClick={() => {
                                setMedia(null);
                                setMediaError("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="rounded-md border border-[#d7e1e9] px-3 py-1.5 text-[10px] font-semibold text-[#687d91] hover:bg-[#f5f8fb]">
                              Batalkan Pilihan
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f6f3] text-[#0e9b90]">
                          <UploadIcon className="h-[18px] w-[18px]" />
                        </span>
                        <p className="text-xs font-semibold text-[#193652]">Seret dan letakkan file di sini</p>
                        <p className="mt-1 text-[10px] text-[#8b9bb0]">atau pilih file dari perangkat Anda</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#0e9b90] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0e9b90] transition hover:bg-[#effaf8]">
                          <UploadIcon className="h-3 w-3" />
                          Pilih File
                        </button>
                        <p className="mt-2 text-[9px] text-[#9aa9b8]">
                          Format: JPG, JPEG, PNG, PDF, DOC, atau DOCX · Maksimal 10 MB
                        </p>
                      </>
                    )}
                  </div>
                  {mediaError && <p role="alert" className="mt-1.5 text-[11px] text-red-600">{mediaError}</p>}
                </div>

                <fieldset>
                  <legend className="mb-2 text-[11px] font-semibold text-[#193652]">
                    Status Publikasi <span className="text-red-500">*</span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      {
                        value: "DRAFT",
                        title: "Draft",
                        description: "Materi tersimpan tetapi tidak ditampilkan kepada pengguna umum.",
                        icon: FileText,
                      },
                      {
                        value: "PUBLISHED",
                        title: "Published",
                        description: "Materi tersimpan dan ditampilkan kepada pengguna umum.",
                        icon: CheckCircle,
                      },
                    ] as const).map((option) => (
                      <label
                        key={option.value}
                        className={`flex min-h-[68px] cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                          status === option.value
                            ? "border-[#0e9b90] bg-[#f3fbfa] ring-1 ring-[#0e9b90]"
                            : "border-[#d5e0e8] bg-white hover:border-[#9db3c4]"
                        }`}>
                        <input
                          type="radio"
                          name="status"
                          value={option.value}
                          checked={status === option.value}
                          onChange={() => setStatus(option.value)}
                          className="mt-0.5 h-3.5 w-3.5 accent-[#0e9b90]"/>
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                          status === option.value ? "bg-[#dff4f0] text-[#0e9b90]" : "bg-[#f0f4f7] text-[#8092a3]"
                        }`}>
                          <option.icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-[11px] font-semibold text-[#193652]">{option.title}</span>
                          <span className="mt-0.5 block text-[9px] leading-4 text-[#8b9bb0]">{option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {(submitError || successMessage) && (
                  <p
                    role={submitError ? "alert" : "status"}
                    className={`rounded-lg px-3 py-2 text-xs ${
                      submitError
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}>
                    {submitError || successMessage}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[#e5edf2] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => router.push("/satgas-ppks/manajemen-edukasi")}
                  disabled={isSubmitting}
                  className="rounded-md border border-[#cbd9e4] bg-white px-4 py-2 text-[11px] font-semibold text-[#60748b] transition hover:bg-[#f5f8fb] disabled:opacity-50">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0e948b] px-4 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#0b7e77] disabled:cursor-not-allowed disabled:opacity-60">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10263a]/50 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmOpen(false);
          }}>
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f5f3] text-[#0e948b]">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h2 id="confirm-title" className="text-base font-bold text-[#193652]">
              Konfirmasi Simpan Perubahan
            </h2>
            <p id="confirm-description" className="mt-2 text-sm leading-6 text-[#71839c]">
              Apakah Anda yakin ingin menyimpan perubahan materi edukasi ini?
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-[#cbd9e4] px-4 py-2.5 text-xs font-semibold text-[#52677e] hover:bg-[#f5f8fb]">
                Kembali Mengedit
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSubmitting}
                className="rounded-lg bg-[#0e948b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b7e77] disabled:cursor-not-allowed disabled:opacity-60">
                Ya, Simpan Perubahan
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}