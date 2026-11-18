"use client";

import { useCallback, useEffect, useState } from "react";

import { BookOpen } from "../../components/icons";
import EdukasiActionMenu from "./EdukasiActionMenu";
import EdukasiStatusBadge from "./EdukasiStatusBadge";

export type EdukasiItem = {
  idEdukasi: string;
  judul: string;
  kategori: string;
  updatedAt: string;
  status: string;
  isi?: string;
  mediaUrl?: string | null;
};

type Props = {
  onDataChange: (items: EdukasiItem[]) => void;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: EdukasiItem[];
};

async function requestKonten(): Promise<EdukasiItem[]> {
  const response = await fetch("/api/satgas-ppks/manajemen-edukasi", {
    cache: "no-store",
  });
  const result: ApiResponse = await response.json();
  if (!response.ok || !result.success || !Array.isArray(result.data)) {
    throw new Error(result.message ?? "Daftar materi edukasi gagal dimuat.");
  }
  return result.data;
}

function formatTanggal(value: string) {
  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(tanggal);
}

export default function EdukasiTable({ onDataChange }: Props) {
  const [items, setItems] = useState<EdukasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchKonten = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await requestKonten();
      setItems(data);
      onDataChange(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Terjadi kesalahan saat mengambil materi edukasi."
      );
      setItems([]);
      onDataChange([]);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    let active = true;

    requestKonten()
      .then((data) => {
        if (!active) return;
        setItems(data);
        onDataChange(data);
      })
      .catch((fetchError: unknown) => {
        if (!active) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Terjadi kesalahan saat mengambil materi edukasi."
        );
        setItems([]);
        onDataChange([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onDataChange]);

  const handleDeleted = (idEdukasi: string) => {
    const updatedItems = items.filter((item) => item.idEdukasi !== idEdukasi);
    setItems(updatedItems);
    onDataChange(updatedItems);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] border-collapse text-left">
        <thead>
          <tr className="bg-[#f1f5f9] text-[10px] font-bold uppercase tracking-wide text-[#52677e]">
            <th className="w-[36%] px-4 py-3">Judul Materi</th>
            <th className="w-[14%] px-4 py-3">Kategori</th>
            <th className="w-[14%] px-4 py-3">Tanggal Diperbarui</th>
            <th className="w-[15%] px-4 py-3">Status Publikasi</th>
            <th className="w-[21%] px-4 py-3 text-left">
              <span className="pl-5">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e8f0]">
          {loading && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#71839c]">
                Memuat materi edukasi...
              </td>
            </tr>
          )}

          {!loading && error && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center">
                <p role="alert" className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchKonten()}
                  className="mt-3 text-xs font-semibold text-[#107b73] hover:underline"
                >
                  Coba lagi
                </button>
              </td>
            </tr>
          )}

          {!loading && !error && items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#107b73]">
                  <BookOpen size={20} />
                </span>
                <p className="text-sm font-semibold text-[#193652]">Belum ada materi edukasi</p>
                <p className="mt-1 text-xs text-[#71839c]">
                  Materi yang ditambahkan akan ditampilkan di daftar ini.
                </p>
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            items.map((item) => (
              <tr key={item.idEdukasi} className="bg-white transition hover:bg-[#fbfdff]">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f5f3] text-[#107b73]">
                      <BookOpen size={15} />
                    </span>
                    <span className="truncate text-xs font-semibold text-[#193652]">
                      {item.judul}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[10px] font-medium text-[#107b73]">
                    {item.kategori}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[#71839c]">
                  {formatTanggal(item.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <EdukasiStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <EdukasiActionMenu konten={item} onDeleted={handleDeleted} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
