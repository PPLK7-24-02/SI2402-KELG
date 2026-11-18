"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { actionSchema, createSchema, keputusanLabels, type ActionInput, type CreateInput, type Examination } from "../contracts";
import { CheckCircle, ClipboardCheck } from "../../components/icons";

const inputClass = "mt-2 block min-w-0 w-full rounded-xl border border-[#dce7ed] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#193652] outline-none placeholder:text-slate-400 focus:border-[#107b73] focus:ring-2 focus:ring-teal-50 disabled:bg-slate-50";
export const buttonClass = "rounded-xl bg-[#107b73] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c655e] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass = "rounded-xl border border-[#dce7ed] bg-white px-4 py-2 text-sm font-semibold text-[#193652] hover:bg-slate-50 disabled:opacity-50";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 text-sm font-medium">{label}{children}</label>;
}

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function iso(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? new Date(value).toISOString() : null;
}

function Actions({ record }: { record?: Pick<CreateInput, "realisasiTindakan" | "tanggalTindakan" | "detailTindakan"> }) {
  return <>
    <Field label="Realisasi tindakan (opsional)"><textarea name="realisasiTindakan" rows={3} maxLength={10000} defaultValue={record?.realisasiTindakan ?? ""} className={inputClass} /></Field>
    <Field label="Tanggal pelaksanaan (opsional, waktu lokal perangkat)"><input name="tanggalTindakan" type="datetime-local" step="1" defaultValue={localDate(record?.tanggalTindakan ?? null)} className={inputClass} /></Field>
    <Field label="Detail tindakan (opsional)"><textarea name="detailTindakan" rows={3} maxLength={10000} defaultValue={record?.detailTindakan ?? ""} className={inputClass} /></Field>
  </>;
}

type Props = {
  pending: boolean;
  blocked?: boolean;
  initialInput?: CreateInput;
  reportNumber?: string;
  onSave: (input: CreateInput) => Promise<boolean>;
};

export function ExaminationForm({ pending, blocked = false, initialInput, reportNumber, onSave }: Props) {
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending || blocked) return;
    const form = event.currentTarget;
    setError("");
    try {
      const data = new FormData(form);
      const parsed = createSchema.safeParse({
        tanggalPemeriksaan: iso(data.get("tanggalPemeriksaan")),
        hasil: data.get("hasil"), kesimpulan: data.get("kesimpulan"), keputusan: data.get("keputusan"), tindakLanjut: data.get("tindakLanjut"),
        realisasiTindakan: data.get("realisasiTindakan") || null,
        tanggalTindakan: iso(data.get("tanggalTindakan")), detailTindakan: data.get("detailTindakan") || null,
      });
      if (!parsed.success) { setError("Lengkapi seluruh isian wajib dengan tanggal dan keputusan yang valid."); return; }
      lock.current = true;
      if (await onSave(parsed.data)) form.reset();
    } catch { setError("Isian belum dapat diproses. Periksa tanggal dan coba kembali."); }
    finally { lock.current = false; }
  }
  return <form onSubmit={submit} aria-labelledby="new-examination">
    <fieldset disabled={pending || blocked} className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <legend className="sr-only">Catatan pemeriksaan baru</legend>
      <section className="min-w-0 space-y-5 rounded-2xl border border-[#dce5ed] border-t-4 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <span className="rounded-xl bg-[#e7f5f3] p-3 text-[#107b73]"><ClipboardCheck className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-bold tracking-widest text-[#107b73]">HASIL PEMERIKSAAN</p><h2 id="new-examination" className="mt-1 text-lg font-bold">Pencatatan Hasil Pemeriksaan</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Lengkapi hasil dan kesimpulan berdasarkan pemeriksaan petugas.</p></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nomor kasus terkait"><input value={reportNumber ?? ""} readOnly className={`${inputClass} bg-slate-50 font-semibold`} /></Field>
          <Field label="Tanggal pemeriksaan atau sidang *"><input name="tanggalPemeriksaan" type="datetime-local" step="1" defaultValue={localDate(initialInput?.tanggalPemeriksaan ?? null)} required className={inputClass} /><span className="mt-1 block text-xs text-slate-500">Waktu lokal perangkat.</span></Field>
        </div>
        <Field label="Hasil pemeriksaan *"><textarea name="hasil" rows={7} maxLength={10000} defaultValue={initialInput?.hasil} placeholder="Tuliskan hasil pemeriksaan atau sidang berdasarkan fakta yang telah diverifikasi…" required className={inputClass} /></Field>
        <fieldset className="rounded-xl border border-[#dce7ed] bg-[#fafcfd] p-4">
          <legend className="px-1 text-sm font-semibold">Keputusan akhir kasus *</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-3">{Object.entries(keputusanLabels).map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm">
            <input type="radio" name="keputusan" value={value} defaultChecked={initialInput?.keputusan === value} required className="h-4 w-4 accent-[#107b73]" />{value === "TERBUKTI" ? "Valid" : value === "TIDAK_VALID" ? "Tidak Valid" : label}
          </label>)}</div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Valid dicatat sebagai Terbukti. Keputusan pemeriksaan tidak mengubah status utama kasus.</p>
        </fieldset>
        <Field label="Kesimpulan pemeriksaan *"><textarea name="kesimpulan" rows={6} maxLength={10000} defaultValue={initialInput?.kesimpulan} placeholder="Tuliskan kesimpulan akhir pemeriksaan secara ringkas dan objektif…" required className={inputClass} /></Field>
        <p className="text-xs text-slate-500">* Wajib diisi. Batas setiap catatan adalah 10.000 karakter.</p>
      </section>
      <div className="min-w-0 space-y-4">
        <section className="space-y-5 rounded-2xl border border-[#dce5ed] border-t-4 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="follow-up-heading">
          <div className="mb-6 flex items-start gap-3"><span className="rounded-xl bg-[#e7f5f3] p-3 text-[#107b73]"><CheckCircle className="h-5 w-5" /></span><div><p className="text-[10px] font-bold tracking-widest text-[#107b73]">TINDAK LANJUT</p><h2 id="follow-up-heading" className="mt-1 text-lg font-bold">Tindakan Lanjutan</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Tetapkan rencana dan catat pelaksanaan tindakan.</p></div></div>
          <Field label="Tindakan lanjutan yang ditetapkan *"><textarea name="tindakLanjut" rows={5} maxLength={10000} defaultValue={initialInput?.tindakLanjut} placeholder="Tuliskan tindakan lanjutan hasil pemeriksaan…" required className={inputClass} /></Field>
          <Actions record={initialInput} />
          <div className="rounded-xl border border-teal-100 bg-[#e7f5f3] p-4"><p className="text-[10px] font-bold tracking-widest text-[#107b73]">HASIL AKAN DITAUTKAN KE</p><p className="mt-2 text-sm font-bold">{reportNumber ? `Kasus ${reportNumber}` : "Kasus yang dipilih"}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Pemeriksaan dan tindakan disimpan pada kasus yang sama.</p></div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className={`${buttonClass} flex w-full items-center justify-center gap-2 py-3.5`}><CheckCircle className="h-4 w-4" />{pending ? "Menyimpan…" : "Simpan Hasil Pemeriksaan"}</button>
        </section>
        <aside className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-xs leading-relaxed text-slate-600"><p className="font-bold text-blue-600">Catatan keamanan data</p><p className="mt-2">Halaman ini tidak menampilkan identitas pelapor atau informasi pribadi yang tidak diperlukan.</p></aside>
      </div>
    </fieldset>
  </form>;
}

export function ActionForm({ record, pending, onSave, onCancel }: {
  record: Examination;
  pending: boolean;
  onSave: (id: string, input: ActionInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending) return;
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const parsed = actionSchema.safeParse({
        realisasiTindakan: data.get("realisasiTindakan") || null,
        tanggalTindakan: iso(data.get("tanggalTindakan")), detailTindakan: data.get("detailTindakan") || null,
      });
      if (!parsed.success) { setError("Periksa isian tindakan dan tanggal pelaksanaan."); return; }
      lock.current = true;
      await onSave(record.idHasil, parsed.data);
    } catch { setError("Tanggal atau isian tindakan tidak valid."); }
    finally { lock.current = false; }
  }
  return <form onSubmit={submit} className="mt-5 border-t border-slate-100 pt-4">
    <fieldset disabled={pending} className="space-y-4">
      <legend className="mb-3 text-sm font-bold">Perbarui pelaksanaan tindakan</legend>
      <p className="text-xs text-slate-500">Hasil, kesimpulan, keputusan, rencana, dan pencatat awal tetap dipertahankan.</p>
      <Actions record={record} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="submit" className={buttonClass}>{pending ? "Menyimpan…" : "Simpan tindakan"}</button><button type="button" onClick={onCancel} className={secondaryClass}>Batal</button></div>
    </fieldset>
  </form>;
}
