"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";
import { casePageSchema, examinationSchema, historyPageSchema, keputusanLabels, type ActionInput, type CaseOption, type CreateInput, type Examination } from "./contracts";
import { CreateRecovery, initialCreateState, type CreateState } from "./create-recovery";
import PortalFrame from "./components/portal-frame";
import { ActionForm, ExaminationForm, secondaryClass } from "./components/examination-form";
import { FileText, ShieldCheck } from "../components/icons";

const base = "/satgas-ppks/us-05/api/kasus";

async function api<T>(url: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options, credentials: "same-origin", cache: "no-store", redirect: "error",
  });
  if (response.status === 401 || response.status === 403) throw new Error("Akses ditolak. Silakan masuk kembali sebagai Satgas PPKS.");
  if (!response.ok) throw new Error(response.status === 400 ? "Data ditolak. Periksa kembali isian." : "Permintaan belum berhasil. Silakan periksa kembali riwayat.");
  // Never display a raw server response, including HTML from an expired session.
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("success" in payload) || payload.success !== true || !("data" in payload)) {
    throw new Error("Respons tidak valid. Silakan masuk kembali atau muat ulang halaman.");
  }
  const parsed = schema.safeParse(payload.data);
  if (!parsed.success) throw new Error("Data belum dapat ditampilkan. Silakan muat ulang halaman.");
  return parsed.data;
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Belum dicatat";
}

function decisionLabel(value: Examination["keputusan"]) {
  return value === "TERBUKTI" ? "Valid" : value === "TIDAK_VALID" ? "Tidak Valid" : keputusanLabels[value];
}

export function CaseInformation({ report, examinationDate, selector }: {
  report: CaseOption | null;
  examinationDate?: string;
  selector: ReactNode;
}) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm" aria-labelledby="select-case">
    <div className="grid gap-5 border-b border-[#e5edf2] bg-[#fafcfd] p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div><p className="text-[10px] font-bold tracking-widest text-[#107b73]">KASUS TERPILIH</p><h2 id="select-case" className="mt-2 text-lg font-bold">Informasi Kasus</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Pilih kasus yang akan didokumentasikan hasil pemeriksaannya.</p></div>
      <div className="min-w-0">{selector}</div>
    </div>
    {report ? <>
      <dl className="grid gap-5 p-5 text-sm sm:grid-cols-2 sm:p-6 xl:grid-cols-3">{[
        ["Nomor kasus", report.nomorKasus],
        ["Kategori kasus", "Belum tersedia dari data kasus"],
        ["Tanggal laporan", "Belum tersedia dari data kasus"],
        ["Lokasi kasus", "Belum tersedia dari data kasus"],
        ["Status saat ini", report.status.replaceAll("_", " ")],
        ["Tanggal pemeriksaan terakhir", examinationDate ? dateLabel(examinationDate) : "Belum tersedia; periksa riwayat"],
      ].map(([label, value]) => <div key={label} className="min-w-0 border-l-2 border-[#e5edf2] pl-4"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 break-words font-semibold">{value}</dd></div>)}</dl>
      <p className="px-5 pb-5 text-xs leading-relaxed text-slate-500 sm:px-6">Jenis laporan: {report.jenis}. Informasi kategori, tanggal laporan, dan lokasi belum tersedia pada halaman ini.</p>
    </> : <p className="p-5 text-sm text-slate-500 sm:p-6">Pilih satu kasus untuk membuka form dan riwayat pemeriksaan.</p>}
  </section>;
}

export function ExaminationHistoryTable({ reportNumber, rows, viewing, onView }: {
  reportNumber: string;
  rows: Examination[];
  viewing: string | null;
  onView: (id: string) => void;
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[850px] table-fixed text-left text-sm">
    <caption className="sr-only">Riwayat hasil pemeriksaan kasus {reportNumber}</caption>
    <thead className="border-y border-[#e5edf2] bg-[#f1f6fa] text-[10px] uppercase tracking-wide text-[#193652]"><tr>
      {["Nomor kasus", "Tanggal pemeriksaan", "Keputusan", "Kesimpulan singkat", "Tindakan lanjutan", "Aksi"].map((label) => <th key={label} scope="col" className={`px-4 py-4 font-bold ${label === "Kesimpulan singkat" || label === "Tindakan lanjutan" ? "w-[23%]" : ""}`}>{label}</th>)}
    </tr></thead>
    <tbody className="divide-y divide-[#e5edf2]">{rows.map((row) => <tr key={row.idHasil} className="align-top">
      <td className="break-words px-4 py-5 text-xs font-bold">{reportNumber}</td>
      <td className="px-4 py-5 text-xs leading-relaxed text-slate-500">{dateLabel(row.tanggalPemeriksaan)}</td>
      <td className="px-4 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.keputusan === "TERBUKTI" ? "bg-emerald-50 text-emerald-700" : row.keputusan === "TIDAK_VALID" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-700"}`}>{decisionLabel(row.keputusan)}</span></td>
      <td className="px-4 py-5"><p className="line-clamp-3 break-words text-xs leading-relaxed text-slate-500">{row.kesimpulan}</p></td>
      <td className="px-4 py-5"><p className="line-clamp-3 break-words text-xs leading-relaxed text-slate-500">{row.tindakLanjut}</p></td>
      <td className="px-4 py-5"><button type="button" aria-expanded={viewing === row.idHasil} aria-controls={`examination-${row.idHasil}`} onClick={() => onView(row.idHasil)} className="flex items-center gap-1.5 text-xs font-semibold text-[#107b73] hover:underline"><FileText className="h-4 w-4 shrink-0" />Lihat Hasil</button></td>
    </tr>)}</tbody>
  </table></div>;
}

function CaseWorkspace({ report, selector, onBusy, creation, onCreate }: {
  report: CaseOption;
  selector: ReactNode;
  onBusy: (busy: boolean) => void;
  creation: CreateState;
  onCreate: (input: CreateInput) => Promise<boolean>;
}) {
  const [rows, setRows] = useState<Examination[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const mutationLock = useRef(false);
  const path = `${base}/${encodeURIComponent(report.idLaporan)}/hasil-pemeriksaan`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await api(`${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, historyPageSchema, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setRows((previous) => cursor ? [...previous, ...data.items] : data.items);
        setNextCursor(data.nextCursor);
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("Riwayat belum dapat dimuat. Periksa koneksi dan akses, lalu coba lagi.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [path, cursor, revision]);

  function refresh() {
    setLoading(true);
    setCursor(null);
    setRevision((value) => value + 1);
  }

  async function update(id: string, input: ActionInput) {
    if (mutationLock.current || creation.phase !== "ready" || creation.busy) return false;
    mutationLock.current = true;
    setPending(true); onBusy(true); setError(""); setNotice("");
    try {
      const data = await api(`${path}/${encodeURIComponent(id)}`, examinationSchema, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      setRows((previous) => previous.map((row) => row.idHasil === id ? data : row));
      setEditing(null);
      setNotice("Pelaksanaan tindakan berhasil diperbarui. Rencana dan hasil pemeriksaan tetap dipertahankan.");
      return true;
    } catch {
      setError("Pembaruan tindakan belum terkonfirmasi. Muat ulang riwayat untuk memeriksa hasil sebelum mencoba lagi.");
      return false;
    } finally { mutationLock.current = false; setPending(false); onBusy(false); }
  }

  return <div className="space-y-6">
    <CaseInformation report={report} examinationDate={rows[0]?.tanggalPemeriksaan} selector={selector} />
    {notice && <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <ExaminationForm reportNumber={report.nomorKasus} pending={pending || creation.busy} blocked={creation.phase !== "ready"}
      initialInput={creation.attempt?.payload} onSave={onCreate} />
    <section className="overflow-hidden rounded-2xl border border-[#dce5ed] border-t-4 bg-white shadow-sm" aria-labelledby="examination-history" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fafcfd] p-5 sm:p-6"><div><p className="text-[10px] font-bold tracking-widest text-[#107b73]">DOKUMENTASI SEBELUMNYA</p><h2 id="examination-history" className="mt-2 text-lg font-bold">Riwayat Hasil Pemeriksaan</h2><p className="mt-1 text-xs text-slate-500">Hasil pemeriksaan dan tindakan yang tercatat untuk kasus ini.</p></div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#e7f5f3] px-3 py-2 text-xs font-semibold text-[#107b73]">{rows.length} catatan dimuat</span><button type="button" disabled={pending || creation.busy || loading} className={secondaryClass} onClick={refresh}>Muat ulang riwayat</button></div></div>
      {loading && <p role="status" className="p-5 text-sm text-slate-500">Memuat riwayat…</p>}
      {!loading && !error && rows.length === 0 && <p className="p-5 text-sm text-slate-500">Belum ada hasil pemeriksaan untuk kasus ini.</p>}
      {rows.length > 0 && <ExaminationHistoryTable reportNumber={report.nomorKasus} rows={rows} viewing={viewing} onView={setViewing} />}
      <div>{rows.map((row) => <article key={row.idHasil} id={`examination-${row.idHasil}`} hidden={viewing !== row.idHasil && editing !== row.idHasil} className="m-4 rounded-xl border border-[#e5edf2] p-4 sm:m-5 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Pemeriksaan {dateLabel(row.tanggalPemeriksaan)}</h3><p className="mt-1 text-xs text-slate-500">Dicatat oleh {row.satgas.nama}</p></div><span className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">{decisionLabel(row.keputusan)}</span></div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[
          ["Hasil pemeriksaan / sidang", row.hasil], ["Kesimpulan", row.kesimpulan],
          ["Rencana tindakan", row.tindakLanjut], ["Realisasi tindakan", row.realisasiTindakan || "Belum dicatat"],
          ["Tanggal pelaksanaan", dateLabel(row.tanggalTindakan)], ["Detail tindakan", row.detailTindakan || "Belum dicatat"],
        ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="font-semibold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
        {editing === row.idHasil ? <ActionForm key={`${row.idHasil}-${revision}`} record={row} pending={pending || creation.busy || creation.phase !== "ready"} onSave={update} onCancel={() => setEditing(null)} /> : <button type="button" disabled={pending || loading || creation.phase !== "ready" || creation.busy} className={`${secondaryClass} mt-4`} onClick={() => setEditing(row.idHasil)}>Perbarui pelaksanaan tindakan</button>}
      </article>)}</div>
      {nextCursor && <button type="button" disabled={pending || loading} onClick={() => { setLoading(true); setCursor(nextCursor); }} className={`${secondaryClass} m-5`}>Muat riwayat berikutnya</button>}
    </section>
  </div>;
}

export default function Us05Client({ satgasName, ownerId }: { satgasName: string; ownerId: string }) {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selected, setSelected] = useState<CaseOption | null>(null);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [creation, setCreation] = useState<CreateState>(initialCreateState);
  const recovery = useRef<CreateRecovery | null>(null);
  const busy = actionBusy || creation.busy || creation.phase !== "ready";

  useEffect(() => {
    let active = true;
    const controller = new CreateRecovery(ownerId, {
      storage: () => window.sessionStorage,
      onChange(state) {
        if (!active) return;
        setCreation(state);
        if (state.attempt) setSelected(state.attempt.report);
      },
    });
    recovery.current = controller;
    // Read browser storage after mount; restoring never sends a POST.
    void Promise.resolve().then(() => { if (active) controller.restore(); });
    return () => { active = false; controller.dispose(); recovery.current = null; };
  }, [ownerId]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const params = new URLSearchParams({ q: search });
      if (cursor) params.set("cursor", cursor);
      try {
        const data = await api(`${base}?${params}`, casePageSchema, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setCases((previous) => cursor ? [...previous, ...data.items] : data.items);
        setNextCursor(data.nextCursor); setError("");
      } catch {
        if (!controller.signal.aborted) setError("Daftar kasus belum dapat dimuat. Periksa koneksi dan session Satgas Anda.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [search, cursor, retry]);

  function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading) return;
    const data = new FormData(event.currentTarget);
    setLoading(true); setCursor(null); setSearch(String(data.get("q") ?? "").trim()); setRetry((value) => value + 1);
  }

  const caseSelector = <div aria-busy={loading}>
      <form onSubmit={find} className="mb-3 flex flex-wrap gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Cari nomor kasus</span><input name="q" defaultValue={search} placeholder="Cari nomor kasus" maxLength={100} disabled={busy || loading} className="w-full rounded-xl border border-[#dce7ed] bg-white px-3 py-2 text-sm outline-none focus:border-[#107b73]" /></label><button type="submit" disabled={busy || loading} className={secondaryClass}>Cari</button></form>
      <label className="block text-xs font-semibold">Pilih nomor kasus<select value={selected?.idLaporan ?? ""} disabled={busy || loading || cases.length === 0} onChange={(event) => setSelected(cases.find((row) => row.idLaporan === event.target.value) ?? null)} className="mt-2 block w-full rounded-xl border border-[#dce7ed] bg-white px-3 py-3 text-sm disabled:bg-slate-50">
        <option value="">Pilih kasus untuk melihat dan mencatat pemeriksaan</option>
        {selected && !cases.some((row) => row.idLaporan === selected.idLaporan) && <option value={selected.idLaporan}>{selected.nomorKasus}</option>}
        {cases.map((row) => <option key={row.idLaporan} value={row.idLaporan}>{row.nomorKasus} · {row.jenis}</option>)}
      </select></label>
      {loading && <p role="status" className="mt-3 text-sm text-slate-500">Memuat kasus…</p>}
      {error && <div role="alert" className="mt-3 text-sm text-red-700"><p>{error}</p><button type="button" disabled={loading || busy} className={`${secondaryClass} mt-2`} onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Coba lagi</button></div>}
      {!loading && !error && cases.length === 0 && <p className="mt-3 text-sm text-slate-500">Tidak ada kasus yang sesuai. Tidak ada data dummy yang ditampilkan.</p>}
      {nextCursor && <button type="button" disabled={loading || busy} className={`${secondaryClass} mt-3`} onClick={() => { setLoading(true); setCursor(nextCursor); }}>Muat kasus berikutnya</button>}
      {busy && <p role="status" className="mt-3 text-xs text-slate-500">Penyimpanan belum selesai atau belum terkonfirmasi. Selesaikan pemulihan sebelum berpindah kasus.</p>}
  </div>;

  return <PortalFrame name={satgasName}>
    <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hasil Pemeriksaan dan Sidang</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">Catat hasil pemeriksaan, keputusan kasus, kesimpulan, dan tindakan lanjutan oleh petugas Satgas PPKS yang berwenang.</p></div>
    <section className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5" aria-label="Informasi kewenangan pencatatan">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><h2 className="text-sm font-bold text-blue-600">Pencatatan hanya untuk petugas Satgas PPKS berwenang</h2><p className="mt-2 text-xs leading-relaxed text-slate-600">Keputusan ditetapkan melalui pemeriksaan petugas. Deteksi AI tidak digunakan sebagai bukti tunggal atau keputusan otomatis.</p></div>
    </section>
    {creation.phase === "loading" && <p role="status" className="text-sm text-slate-500">Memeriksa pemulihan percobaan penyimpanan…</p>}
    {creation.message && <section role="status" className={`rounded-xl border p-4 text-sm ${creation.phase === "ready" ? "border-teal-100 bg-teal-50 text-teal-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <p>{creation.message}</p>
      {creation.attempt && <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={creation.busy || actionBusy} className={secondaryClass} onClick={() => { void recovery.current?.verify(); }}>Verifikasi hasil penyimpanan</button>
        <button type="button" disabled={creation.busy || actionBusy || !creation.canRetry} className={secondaryClass} onClick={() => { void recovery.current?.retry(); }}>Kirim ulang percobaan yang sama</button>
      </div>}
    </section>}
    {selected ? <CaseWorkspace key={`${selected.idLaporan}-${creation.confirmation}`} report={selected} selector={caseSelector} onBusy={setActionBusy} creation={creation}
      onCreate={(input) => recovery.current?.submit(selected, input) ?? Promise.resolve(false)} /> : <CaseInformation report={null} selector={caseSelector} />}
  </PortalFrame>;
}
