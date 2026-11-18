"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  judul: string;
  kategori: string;
  isi: string;
  media: File | null;
};

function isImage(file: File) {
  return ["jpg", "jpeg", "png"].includes(file.name.split(".").pop()?.toLowerCase() ?? "");
}

export default function PreviewMateri({
  isOpen,
  onClose,
  judul,
  kategori,
  isi,
  media,
}: Props) {
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !media || !isImage(media)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview({ file: media, url: reader.result });
      }
    };
    reader.readAsDataURL(media);
    return () => reader.abort();
  }, [isOpen, media]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#10263a]/55 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        className="my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#e5edf2] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0e948b]">
              Pratinjau Materi
            </p>
            <h2 id="preview-title" className="mt-1 text-base font-bold text-[#193652]">
              {judul.trim() || "Judul Materi"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup preview"
            className="rounded-lg p-2 text-[#71839c] transition hover:bg-[#f1f5f9] hover:text-[#193652]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m18 6-12 12M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          <span className="inline-flex rounded-full bg-[#e8f5f3] px-3 py-1 text-[11px] font-medium text-[#107b73]">
            {kategori || "Kategori belum dipilih"}
          </span>
          <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-[#52677e]">
            {isi.trim() || "Isi materi yang Anda tulis akan ditampilkan di sini."}
          </div>

          {media && (
            <div className="mt-6 rounded-lg border border-[#e1e9ef] bg-[#fbfdff] p-4">
              <h3 className="text-xs font-semibold text-[#193652]">Media Pendukung</h3>
              {isImage(media) && imagePreview?.file === media ? (
                <div className="mt-3">
                  <Image
                    src={imagePreview.url}
                    alt={`Pratinjau ${media.name}`}
                    width={960}
                    height={640}
                    unoptimized
                    className="max-h-80 w-full rounded-lg object-contain"
                  />
                  <p className="mt-2 break-all text-[11px] text-[#71839c]">{media.name}</p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-lg bg-white p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f5f3] text-[#107b73]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M8 13h8M8 17h8" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block break-all text-xs font-semibold text-[#193652]">{media.name}</span>
                    <span className="mt-1 block text-[10px] text-[#71839c]">
                      Dokumen · {(media.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[#e5edf2] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0e948b] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0b7e77]"
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  );
}
