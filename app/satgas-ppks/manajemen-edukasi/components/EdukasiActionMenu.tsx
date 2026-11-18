"use client";

import Link from "next/link";
import { useState } from "react";

import { FileText } from "../../components/icons";
import type { EdukasiItem } from "./EdukasiTable";

type Props = {
  konten: EdukasiItem;
  onDeleted: (idEdukasi: string) => void;
};

export default function EdukasiActionMenu({ konten, onDeleted }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteKonten() {
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/satgas-ppks/manajemen-edukasi?id=${encodeURIComponent(konten.idEdukasi)}`,
        { method: "DELETE" }
      );
      const result: { success?: boolean; message?: string } = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Materi edukasi gagal dihapus.");
      }

      onDeleted(konten.idEdukasi);
      setConfirmOpen(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Terjadi kesalahan saat menghapus materi."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-start gap-3 whitespace-nowrap pl-4 text-[11px] font-semibold">
        <Link
          href={`/satgas-ppks/manajemen-edukasi/detail/${encodeURIComponent(konten.idEdukasi)}`}
          className="inline-flex items-center gap-1 text-[#107b73] transition hover:text-[#075e57]"
          aria-label={`Lihat ${konten.judul}`}
        >
          <FileText size={13} />
          Lihat
        </Link>
        <Link
          href={`/satgas-ppks/manajemen-edukasi/edit/${encodeURIComponent(konten.idEdukasi)}`}
          className="inline-flex items-center gap-1 text-[#107b73] transition hover:text-[#075e57]"
          aria-label={`Edit ${konten.judul}`}
        >
          <EditIcon />
          Edit
        </Link>
        <button
          type="button"
          onClick={() => {
            setError("");
            setConfirmOpen(true);
          }}
          className="inline-flex items-center gap-1 text-[#dc2626] transition hover:text-[#b91c1c]"
          aria-label={`Hapus ${konten.judul}`}
        >
          <TrashIcon />
          Hapus
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2133]/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setConfirmOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TrashIcon />
            </div>
            <h2 id="delete-dialog-title" className="text-base font-bold text-[#193652]">
              Hapus materi edukasi?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#71839c]">
              Materi <span className="font-semibold text-[#193652]">{konten.judul}</span>{" "}
              akan dihapus secara permanen.
            </p>
            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-[#dce4ea] px-4 py-2 text-sm font-semibold text-[#60748b] hover:bg-[#f5f8fb] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteKonten}
                disabled={deleting}
                className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[13px] w-[13px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 5 3 3M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[13px] w-[13px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
    </svg>
  );
}
