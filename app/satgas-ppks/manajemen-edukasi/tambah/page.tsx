"use client";

import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";

import {
  BookOpen,
  CheckCircle,
  FileText,
  X,
} from "../../components/icons";
import SatgasFrame from "../../components/SatgasFrame";
import PreviewMateri from "./components/PreviewMateri";

const KATEGORI = [
  "Pemahaman Dasar",
  "Pencegahan",
  "Hak dan Privasi",
  "Panduan Tindakan",
  "Panduan Pelaporan",
] as const;

type StatusMateri = "DRAFT" | "PUBLISHED";
type ApiResponse = { success?: boolean; message?: string };

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

function validasiMedia(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!Object.hasOwn(MEDIA_TYPES, extension) || MEDIA_TYPES[extension] !== file.type) {
    return "Format file harus JPG, JPEG, PNG, PDF, DOC, atau DOCX.";
  }
  if (file.size > MAX_MEDIA_SIZE) return "Ukuran file maksimal 10 MB.";
  if (file.size === 0) return "File tidak boleh kosong.";
  return null;
}

export default function TambahMateriPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [satgasName, setSatgasName] = useState<string | null>(null);
  const [satgasInitials, setSatgasInitials] = useState<string | null>(null);
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState<(typeof KATEGORI)[number] | "">("");
  const [isi, setIsi] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [status, setStatus] = useState<StatusMateri>("PUBLISHED");
  const [statusChanged, setStatusChanged] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
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
        console.error("[TAMBAH_MATERI_EDUKASI] Gagal mengambil session pengguna:", error);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const removeMedia = () => {
    setMedia(null);
    setMediaError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isFormFilled = Boolean(judul.trim() || kategori || isi.trim() || media || statusChanged);

  const handleCancel = () => {
    if (isFormFilled) {
      setCancelOpen(true);
    } else {
      router.push("/satgas-ppks/manajemen-edukasi");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    const formData = new FormData();
    formData.set("judul", judul.trim());
    formData.set("kategori", kategori);
    formData.set("isi", isi.trim());
    formData.set("status", status);
    if (media) formData.set("media", media);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/satgas-ppks/manajemen-edukasi", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Materi edukasi gagal disimpan.");
      }
      setSuccessMessage(result.message ?? "Materi edukasi berhasil ditambahkan.");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan materi edukasi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SatgasFrame
      satgas={satgasName && satgasInitials ? { name: satgasName, initials: satgasInitials } : null}
      jejak={[{ label: "Manajemen Edukasi", href: "/satgas-ppks/manajemen-edukasi" }, { label: "Tambah Materi" }]}
      judul="Manajemen Konten Edukasi"
    >
        <div>
          <section className="mb-5">
            <h1 className="text-[22px] font-bold tracking-tight text-[#193652] sm:text-[24px]">
              Tambah Materi Edukasi
            </h1>
            <p className="mt-1.5 text-xs text-[#71839c]">
              Tambahkan materi edukasi baru untuk pengguna SAFE SPACE.
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-xl border border-[#dce6ed] bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-[#e5edf2] px-5 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f5f3] text-[#0e9b90]">
                <FileText className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#193652]">Informasi Materi</h2>
                <p className="mt-0.5 text-[10px] text-[#8b9bb0]">
                  Lengkapi informasi berikut untuk menambahkan materi edukasi baru.
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
                  placeholder="Masukkan judul materi edukasi"
                  className="h-10 w-full rounded-md border border-[#cbd9e4] px-3 text-xs text-[#193652] outline-none transition placeholder:text-[#a7b5c3] focus:border-[#0e9b90] focus:ring-2 focus:ring-[#0e9b90]/10"
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
                  className="h-10 w-full rounded-md border border-[#cbd9e4] bg-white px-3 text-xs text-[#193652] outline-none transition focus:border-[#0e9b90] focus:ring-2 focus:ring-[#0e9b90]/10"
                >
                  <option value="" disabled>Pilih kategori materi</option>
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
                  placeholder="Tuliskan isi materi edukasi secara lengkap..."
                  rows={5}
                  className="min-h-32 w-full resize-y rounded-md border border-[#cbd9e4] px-3 py-3 text-xs leading-5 text-[#193652] outline-none transition placeholder:text-[#a7b5c3] focus:border-[#0e9b90] focus:ring-2 focus:ring-[#0e9b90]/10"
                />
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
                  Tambahkan gambar atau dokumen untuk mendukung materi edukasi.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  className="sr-only"
                  onChange={handleFileChange}
                  aria-label="Pilih media pendukung"
                />
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`mt-2 flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-4 text-center transition ${
                    dragging ? "border-[#0e9b90] bg-[#f0fbf9]" : "border-[#a9c5d8] bg-[#fbfdff]"
                  }`}
                >
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
                          className="rounded-md border border-[#0e9b90] px-3 py-1.5 text-[10px] font-semibold text-[#0e9b90] hover:bg-[#effaf8]"
                        >
                          Ganti File
                        </button>
                        <button
                          type="button"
                          onClick={removeMedia}
                          className="rounded-md border border-[#d7e1e9] px-3 py-1.5 text-[10px] font-semibold text-[#687d91] hover:bg-[#f5f8fb]"
                        >
                          Batalkan File
                        </button>
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
                        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#0e9b90] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0e9b90] transition hover:bg-[#effaf8]"
                      >
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
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={status === option.value}
                        onChange={() => {
                          setStatus(option.value);
                          setStatusChanged(true);
                        }}
                        className="mt-0.5 h-3.5 w-3.5 accent-[#0e9b90]"
                      />
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
                  }`}
                >
                  {submitError || successMessage}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e5edf2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#0e9b90] bg-white px-4 py-2 text-[11px] font-semibold text-[#0e9b90] transition hover:bg-[#effaf8]"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Preview
                </button>
                <p className="mt-1 text-[9px] text-[#9aa9b8]">Lihat hasil konten sebelum dipublikasikan.</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="rounded-md border border-[#cbd9e4] bg-white px-4 py-2 text-[11px] font-semibold text-[#60748b] transition hover:bg-[#f5f8fb] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0e948b] px-4 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#0b7e77] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {isSubmitting ? "Menyimpan..." : "Simpan Konten Materi"}
                </button>
              </div>
            </div>
          </form>
        </div>

      <PreviewMateri
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        judul={judul}
        kategori={kategori}
        isi={isi}
        media={media}
      />

      {cancelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10263a]/50 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCancelOpen(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            aria-describedby="cancel-description"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <X className="h-5 w-5" />
            </div>
            <h2 id="cancel-title" className="text-base font-bold text-[#193652]">
              Batalkan penambahan materi?
            </h2>
            <p id="cancel-description" className="mt-2 text-sm leading-6 text-[#71839c]">
              Data yang sudah Anda isi tidak akan disimpan jika Anda membatalkan.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="rounded-lg border border-[#cbd9e4] px-4 py-2.5 text-xs font-semibold text-[#52677e] hover:bg-[#f5f8fb]"
              >
                Kembali Mengisi
              </button>
              <button
                type="button"
                onClick={() => router.push("/satgas-ppks/manajemen-edukasi")}
                className="rounded-lg bg-[#0e948b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b7e77]"
              >
                Ya, Batalkan
              </button>
            </div>
          </section>
        </div>
      )}
    </SatgasFrame>
  );
}