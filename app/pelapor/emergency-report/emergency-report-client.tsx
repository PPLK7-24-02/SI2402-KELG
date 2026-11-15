"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { ReactNode } from "react";

export function EmergencyIcon({ name, className = "h-5 w-5" }: { name: "home" | "edit" | "alert" | "search" | "book" | "shield" | "info" | "bell" | "chevron" | "back"; className?: string }) {
  const paths: Record<typeof name, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    edit: <><path d="m16 4 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z" /></>,
    alert: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
    search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
    book: <><path d="M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 1 4 4 0 0 0-4-1H3V4Z" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    back: <path d="m14 6-6 6 6 6" />,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

type Evidence = { idBukti: string; namaFile: string; tipeFile: string };
type Report = { idLaporan: string; nomorKasus: string; createdAt: string; detailLokasi: string; lampiran: Evidence[] };
type Phase = "ready" | "creating" | "report-created" | "locating" | "location-failed" | "ready-for-evidence" | "recording" | "uploading" | "completed" | "error";
const MAX_SIZE = 20 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
const ACCEPT = TYPES.join(",");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const createdSchema = z.object({ success: z.literal(true), data: z.object({ idLaporan: z.string().min(1).max(30), nomorKasus: z.string().min(1).max(50), createdAt: z.iso.datetime() }) });
const evidenceSchema = z.object({ success: z.literal(true), data: z.object({ lampiran: z.array(z.object({ idBukti: z.string(), namaFile: z.string(), tipeFile: z.string() })) }) });
const rejectedUploadSchema = z.object({ success: z.literal(false), code: z.literal("UPLOAD_REJECTED_BEFORE_WRITE") });
const PRE_WRITE_REJECTION_STATUSES = new Set([400, 401, 403, 404, 413, 415]);
const pendingUploadSchema = z.object({ key: z.string().regex(UUID), ids: z.array(z.string().regex(/^ev[0-9a-f]{28}$/)).min(1).max(5) }).strict();
type PendingUpload = z.infer<typeof pendingUploadSchema>;
const savedSchema = z.object({ key: z.string().regex(UUID).nullable(), id: z.string().min(1).max(30).optional(), upload: pendingUploadSchema.optional() }).strict()
  .refine(value => Boolean(value.key || value.id) && (!value.upload || Boolean(value.id)));
const button = "rounded-lg bg-[#108980] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#096f68] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50";

async function readJSON(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Respons server belum dapat dibaca. Laporan yang telah tersimpan tidak dibatalkan.");
  try { return await response.json(); }
  catch { throw new Error("Respons server belum terkonfirmasi. Coba ulang tindakan yang sama; jangan membuat SOS baru."); }
}
function message(value: unknown, fallback: string) {
  const parsed = z.object({ message: z.string().max(500) }).safeParse(value);
  return parsed.success ? parsed.data.message : fallback;
}
function hasGPS(detail: string) {
  try { return z.object({ source: z.literal("SOS_GPS"), version: z.literal(1) }).safeParse(JSON.parse(detail)).success; } catch { return false; }
}
const sizeLabel = (size: number) => `${(size / 1024 / 1024).toFixed(2)} MiB`;
async function sha256(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function reportIdFor(owner: string, key: string) {
  return `sos${(await sha256(JSON.stringify(["emergency-create-v1", owner, key.trim().toLowerCase()]))).slice(0, 27)}`;
}
// Matches the existing append endpoint; only IDs/key are persisted, never file contents.
async function evidenceIdsFor(owner: string, id: string, key: string, files: File[]) {
  return Promise.all(files.map(async (file, index) => {
    const name = file.name.replace(/[\\/\u0000-\u001f\u007f]/g, "_").slice(0, 255) || "bukti-sos";
    const type = file.type.split(";", 1)[0].trim().toLowerCase();
    return `ev${(await sha256(JSON.stringify([owner, id, key.toLowerCase(), index, name, type, await sha256(await file.arrayBuffer())]))).slice(0, 28)}`;
  }));
}

export default function EmergencyReportClient({ ownerId, initialReport, resumeFailed }: { ownerId: string; initialReport: Report | null; resumeFailed: boolean }) {
  const router = useRouter();
  const storageKey = `safe-space:sos:v1:${ownerId}`;
  const [report, setReport] = useState<Report | null>(initialReport);
  const reportRef = useRef(initialReport);
  const keyRef = useRef<string | null>(null);
  const previousKey = useRef<string | null>(null);
  const previousReportId = useRef<string | null>(null);
  const storageSnapshot = useRef<string | null | undefined>(undefined);
  const blockedRef = useRef(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [recoveryHref, setRecoveryHref] = useState<string | null>(null);
  const generation = useRef(0);
  const createUncertain = useRef(false);
  const createBusy = useRef(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState(resumeFailed ? "Laporan belum dapat diverifikasi. Jangan mengaktifkan SOS baru untuk mencoba ulang laporan yang sama." : "");
  const [storageWarning, setStorageWarning] = useState("");
  const [location, setLocation] = useState<"idle" | "locating" | "saved" | "failed">(initialReport && hasGPS(initialReport.detailLokasi) ? "saved" : "idle");
  const [locationMessage, setLocationMessage] = useState(initialReport && hasGPS(initialReport.detailLokasi) ? "Lokasi GPS sudah tersimpan pada laporan." : "Lokasi diambil setelah laporan berhasil tersimpan.");
  const gpsBusy = useRef(false);
  const gpsAttempted = useRef<string | null>(null);
  const mounted = useRef(false);
  const requests = useRef(new Set<AbortController>());
  const [files, setFiles] = useState<File[]>([]);
  const uploadKey = useRef<string | null>(null);
  const pendingUploadRef = useRef<PendingUpload | undefined>(undefined);
  const [pendingUpload, setPendingUpload] = useState(false);
  const uploadBusy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>(initialReport?.lampiran ?? []);
  const [recording, setRecording] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const mediaBusy = useRef(false);
  const mediaGeneration = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const blockStorage = useCallback(() => {
    blockedRef.current = true; setStorageBlocked(true);
    setStorageWarning("State aktivasi tidak dapat diverifikasi. SOS baru diblokir agar laporan tidak ganda. Jangan hapus penyimpanan browser; pulihkan akses/state asli lalu verifikasi ulang. Laporan tersimpan tetap ada.");
  }, []);
  const checkStorage = useCallback(() => {
    if (storageSnapshot.current === undefined || sessionStorage.getItem(storageKey) !== storageSnapshot.current) throw new Error("State aktivasi berubah atau tidak dapat dibaca.");
  }, [storageKey]);
  const persist = useCallback((key: string | null, id?: string, upload?: PendingUpload) => {
    try {
      checkStorage();
      const value = JSON.stringify({ key, ...(id ? { id } : {}), ...(upload ? { upload } : {}) });
      sessionStorage.setItem(storageKey, value);
      if (sessionStorage.getItem(storageKey) !== value) throw new Error("State tidak tersimpan.");
      storageSnapshot.current = value;
    } catch { blockStorage(); throw new Error("Penyimpanan aktivasi gagal. Tidak ada SOS baru yang boleh dikirim sampai state dipulihkan."); }
  }, [storageKey, checkStorage, blockStorage]);
  const stopMedia = useCallback(() => {
    mediaGeneration.current += 1;
    mediaBusy.current = false;
    if (mounted.current) setOpeningCamera(false);
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    recordingTimer.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    const activeRequests = requests.current;
    window.addEventListener("pagehide", stopMedia);
    const hidden = () => { if (document.hidden) stopMedia(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      generation.current += 1;
      stopMedia();
      for (const controller of activeRequests) controller.abort();
      window.removeEventListener("pagehide", stopMedia);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [stopMedia]);
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let navigating = false;
      try {
        const raw = sessionStorage.getItem(storageKey);
        const saved = raw === null ? undefined : savedSchema.parse(JSON.parse(raw));
        const derivedId = saved?.key ? await reportIdFor(ownerId, saved.key) : null;
        if (cancelled) return;
        storageSnapshot.current = raw;
        if (saved?.id && derivedId && saved.id !== derivedId) throw new Error("Pasangan key-ID tidak konsisten.");
        if (initialReport && saved && (saved.id ?? derivedId) !== initialReport.idLaporan) {
          setRecoveryHref(saved.id ? `/pelapor/emergency-report?report=${encodeURIComponent(saved.id)}` : "/pelapor/emergency-report");
          throw new Error("URL dan aktivasi browser berbeda.");
        }
        keyRef.current = saved?.key?.toLowerCase() ?? null;
        if (initialReport) {
          const pending = saved?.upload && !saved.upload.ids.every(id => initialReport.lampiran.some(item => item.idBukti === id)) ? saved.upload : undefined;
          pendingUploadRef.current = pending; setPendingUpload(Boolean(pending)); uploadKey.current = pending?.key ?? null;
          persist(keyRef.current, initialReport.idLaporan, pending);
          if (pending) setUploadMessage("Upload sebelumnya belum terkonfirmasi. Pilih kembali batch file asli dalam urutan yang sama untuk retry, atau verifikasi ulang jika bukti sudah tersimpan. Aktivasi baru diblokir.");
        } else if (saved?.id && !resumeFailed) {
          navigating = true;
          router.replace(`/pelapor/emergency-report?report=${encodeURIComponent(saved.id)}`);
          return;
        } else if (saved?.key && !resumeFailed) {
          createUncertain.current = true;
          setError("Pengiriman sebelumnya belum terkonfirmasi. Tekan tombol darurat untuk memverifikasi dengan key SOS yang sama; jangan memulai aktivasi baru.");
        }
      } catch { if (!cancelled) blockStorage(); }
      finally { if (!cancelled && !navigating) setRestoring(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, [initialReport, persist, resumeFailed, router, storageKey, ownerId, blockStorage]);

  function beginNewActivation() {
    if (!reportRef.current || createBusy.current || createUncertain.current || restoring || resumeFailed || blockedRef.current) return;
    if (uploadBusy.current || pendingUploadRef.current || recording || openingCamera || mediaBusy.current || recorderRef.current) {
      setError("Selesaikan/verifikasi upload atau hentikan rekaman terlebih dahulu. Aktivasi baru belum dimulai.");
      return;
    }
    try {
      checkStorage();
      sessionStorage.removeItem(storageKey);
      if (sessionStorage.getItem(storageKey) !== null) throw new Error("State lama belum dilepas.");
      storageSnapshot.current = null;
      const url = new URL(window.location.href); url.searchParams.delete("report");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch { blockStorage(); return; }
    // Invalidate GPS/HTTP/media callbacks before clearing the active context.
    generation.current += 1;
    for (const controller of requests.current) controller.abort();
    stopMedia(); recorderRef.current = null; mediaBusy.current = false;
    previousReportId.current = reportRef.current.idLaporan;
    previousKey.current = keyRef.current; keyRef.current = null;
    reportRef.current = null; setReport(null); createUncertain.current = false;
    gpsBusy.current = false; gpsAttempted.current = null; setLocation("idle");
    setLocationMessage("Lokasi diambil setelah laporan berhasil tersimpan.");
    setFiles([]); setEvidence([]); uploadKey.current = null; pendingUploadRef.current = undefined;
    setPendingUpload(false); setUploading(false); setUploadMessage(""); setRecording(false); setOpeningCamera(false);
    setError(""); setStorageWarning(""); setRecoveryHref(null);
  }

  const send = useCallback(async (url: string, init: RequestInit) => {
    const controller = new AbortController();
    requests.current.add(controller);
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, { ...init, credentials: "same-origin", redirect: "error", signal: controller.signal });
      return { response, body: await readJSON(response) };
    }
    finally { clearTimeout(timer); requests.current.delete(controller); }
  }, []);

  async function createSOS() {
    if (createBusy.current || reportRef.current || restoring || resumeFailed || blockedRef.current) return;
    const activeGeneration = generation.current;
    createBusy.current = true; setCreating(true); setError("");
    try {
      checkStorage();
      keyRef.current ??= crypto.randomUUID();
      if (keyRef.current === previousKey.current) throw new Error("Key baru berbenturan. Aktivasi belum dikirim.");
      persist(keyRef.current);
      const expectedId = await reportIdFor(ownerId, keyRef.current);
      if (expectedId === previousReportId.current) throw new Error("Key mengarah ke laporan sebelumnya. Aktivasi baru belum dikirim.");
      if (!mounted.current || generation.current !== activeGeneration) return;
      createUncertain.current = true;
      const { response, body } = await send("/pelapor/emergency-report/api/create", { method: "POST", headers: { "Idempotency-Key": keyRef.current } });
      const parsed = createdSchema.safeParse(body);
      if (!mounted.current || generation.current !== activeGeneration) return;
      if (!response.ok || !parsed.success || parsed.data.data.idLaporan !== expectedId) throw new Error(message(body, "Laporan belum terkonfirmasi. Coba kirim ulang dengan key yang sama."));
      const confirmed: Report = { ...parsed.data.data, detailLokasi: "", lampiran: [] };
      reportRef.current = confirmed; setReport(confirmed);
      createUncertain.current = false;
      persist(keyRef.current, confirmed.idLaporan);
      // A refresh now loads ownership-verified report/evidence from the server page.
      const url = new URL(window.location.href);
      url.searchParams.set("report", confirmed.idLaporan);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    } catch (failure) {
      if (mounted.current && generation.current === activeGeneration) {
        try { checkStorage(); } catch { blockStorage(); }
        setError(failure instanceof Error && failure.name !== "AbortError" ? failure.message : "Koneksi terputus atau timeout. Hasil SOS belum pasti; coba kirim ulang dengan key yang sama.");
      }
    } finally { if (generation.current === activeGeneration) { createBusy.current = false; if (mounted.current) setCreating(false); } }
  }

  const locate = useCallback(async () => {
    if (!report || reportRef.current?.idLaporan !== report.idLaporan || gpsBusy.current) return;
    const activeGeneration = generation.current;
    gpsBusy.current = true; setLocation("locating"); setLocationMessage("Meminta lokasi perangkat…");
    try {
      if (!navigator.geolocation) throw new Error("Perangkat tidak mendukung GPS. Laporan SOS tetap tersimpan.");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }));
      if (!mounted.current || generation.current !== activeGeneration) return;
      const { response, body } = await send(`/api/laporan/${encodeURIComponent(report.idLaporan)}/lokasi`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() }) });
      if (!response.ok) throw new Error(message(body, "Lokasi belum tersimpan. Coba lagi tanpa membuat SOS baru."));
      if (mounted.current && generation.current === activeGeneration) { setLocation("saved"); setLocationMessage(`Lokasi tersimpan, akurasi sekitar ${Math.round(position.coords.accuracy)} meter.`); }
    } catch (failure) {
      if (mounted.current && generation.current === activeGeneration) {
        setLocation("failed");
        const detail = failure instanceof Error ? failure.message : "Izin lokasi ditolak, timeout, atau lokasi tidak tersedia.";
        setLocationMessage(`${detail} Laporan SOS tetap tersimpan. Anda dapat mencoba GPS lagi.`);
      }
    } finally { if (generation.current === activeGeneration) gpsBusy.current = false; }
  }, [report, send]);
  useEffect(() => {
    if (report && gpsAttempted.current !== report.idLaporan) {
      const activeGeneration = generation.current;
      const timer = setTimeout(() => {
        if (!mounted.current || generation.current !== activeGeneration || reportRef.current?.idLaporan !== report.idLaporan) return;
        gpsAttempted.current = report.idLaporan;
        if (!hasGPS(report.detailLokasi)) void locate();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [locate, report]);

  function addFiles(incoming: File[]) {
    if (uploadBusy.current || (pendingUploadRef.current && files.length)) return;
    const valid = incoming.filter(file => TYPES.includes(file.type.split(";", 1)[0].toLowerCase()) && file.size > 0 && file.size <= MAX_SIZE);
    const available = Math.max(0, 5 - evidence.length - files.length);
    if (valid.length !== incoming.length || valid.length > available) setUploadMessage("Pilih foto/video yang didukung, maksimal 20 MiB per file dan total 5 bukti per laporan. File yang tidak memenuhi batas dilewati.");
    else setUploadMessage("");
    setFiles(current => [...current, ...valid.slice(0, available)]);
    if (!pendingUploadRef.current) uploadKey.current = null;
  }
  async function upload() {
    if (!report || reportRef.current?.idLaporan !== report.idLaporan || !files.length || uploadBusy.current || recording || blockedRef.current || restoring) return;
    const activeGeneration = generation.current;
    // A rejection of a retry says nothing about a previous attempt's outcome.
    const retryingPendingBatch = pendingUploadRef.current !== undefined;
    uploadBusy.current = true; setUploading(true); setUploadMessage("Mengunggah bukti…");
    try {
      uploadKey.current ??= crypto.randomUUID();
      const ids = await evidenceIdsFor(ownerId, report.idLaporan, uploadKey.current, files);
      if (!mounted.current || generation.current !== activeGeneration) return;
      if (pendingUploadRef.current && JSON.stringify(ids) !== JSON.stringify(pendingUploadRef.current.ids)) throw new Error("Batch berbeda dari upload yang belum pasti. Pilih file asli dalam urutan yang sama; jangan membuat batch baru.");
      const pending = { key: uploadKey.current, ids };
      persist(keyRef.current, report.idLaporan, pending);
      pendingUploadRef.current = pending; setPendingUpload(true);
      const body = new FormData(); files.forEach(file => body.append("lampiran", file));
      const { response, body: result } = await send(`/api/laporan/${encodeURIComponent(report.idLaporan)}/bukti`, { method: "POST", headers: { "Idempotency-Key": uploadKey.current }, body });
      if (!mounted.current || generation.current !== activeGeneration) return;
      if (PRE_WRITE_REJECTION_STATUSES.has(response.status) && rejectedUploadSchema.safeParse(result).success) {
        if (!retryingPendingBatch && pendingUploadRef.current === pending) {
          // Persist first. If storage cannot be verified, keep the batch locked.
          persist(keyRef.current, report.idLaporan);
          pendingUploadRef.current = undefined; setPendingUpload(false);
          setUploadMessage(`${message(result, "Upload ditolak sebelum penyimpanan.")} Laporan SOS dan bukti tersimpan tetap ada. Lepas file yang ditolak lalu pilih file yang benar, atau mulai keadaan darurat baru.`);
          return;
        }
        throw new Error(`${message(result, "Percobaan upload ini ditolak sebelum penyimpanan.")} Hasil percobaan batch sebelumnya masih belum pasti; gunakan key dan file yang sama untuk retry atau verifikasi bukti tersimpan.`);
      }
      const parsed = evidenceSchema.safeParse(result);
      if (!response.ok || !parsed.success || parsed.data.data.lampiran.length !== ids.length || !ids.every(id => parsed.data.data.lampiran.some(item => item.idBukti === id))) throw new Error(message(result, "Upload belum terkonfirmasi. Ulangi batch yang sama."));
      setEvidence(current => [...new Map([...current, ...parsed.data.data.lampiran].map(item => [item.idBukti, item])).values()]);
      persist(keyRef.current, report.idLaporan);
      pendingUploadRef.current = undefined; setPendingUpload(false);
      setFiles([]); uploadKey.current = null;
      setUploadMessage("Bukti berhasil ditautkan. Laporan SOS tetap tersimpan.");
    } catch (failure) {
      if (mounted.current && generation.current === activeGeneration) setUploadMessage(`${failure instanceof Error && failure.name !== "AbortError" ? failure.message : "Upload terputus atau timeout; ulangi batch yang sama."} Laporan SOS tetap tersimpan.`);
    } finally { if (generation.current === activeGeneration) { uploadBusy.current = false; if (mounted.current) setUploading(false); } }
  }
  async function startRecording() {
    if (!report || reportRef.current?.idLaporan !== report.idLaporan || mediaBusy.current || recorderRef.current || uploading || pendingUploadRef.current) return;
    const activeGeneration = generation.current;
    mediaBusy.current = true; setOpeningCamera(true); setUploadMessage("");
    const mediaToken = mediaGeneration.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Rekaman langsung tidak didukung. Gunakan tombol kamera atau pilih file.");
      const mime = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Format rekaman perangkat belum didukung. Gunakan pilihan video/file.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
      if (!mounted.current || activeGeneration !== generation.current || mediaToken !== mediaGeneration.current || document.hidden) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      let size = 0;
      recorder.ondataavailable = event => {
        if (!mounted.current || activeGeneration !== generation.current) return;
        if (event.data.size) { chunks.push(event.data); size += event.data.size; }
        if (size >= MAX_SIZE && recorder.state !== "inactive") stopMedia();
      };
      recorder.onerror = () => { if (mounted.current && activeGeneration === generation.current) { setUploadMessage("Rekaman gagal. Gunakan foto/video dari perangkat; laporan tetap tersimpan."); stopMedia(); } };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (!mounted.current || activeGeneration !== generation.current) return;
        recorderRef.current = null; streamRef.current = null;
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        if (!mounted.current) return;
        setRecording(false);
        const type = recorder.mimeType || mime;
        const blob = new Blob(chunks, { type });
        if (!blob.size || blob.size > MAX_SIZE) { setUploadMessage("Rekaman kosong atau melampaui 20 MiB. Rekam lebih singkat; laporan tetap tersimpan."); return; }
        addFiles([new File([blob], `sos-video-${Date.now()}.${type.startsWith("video/mp4") ? "mp4" : "webm"}`, { type })]);
      };
      recorder.start(1000); setRecording(true);
      recordingTimer.current = setTimeout(stopMedia, 60_000);
    } catch (failure) {
      if (mounted.current && activeGeneration === generation.current && mediaToken === mediaGeneration.current) {
        stopMedia(); recorderRef.current = null;
        setUploadMessage(`${failure instanceof Error ? failure.message : "Izin kamera/mikrofon tidak tersedia."} Laporan SOS tetap tersimpan.`);
      }
    } finally { if (activeGeneration === generation.current && mediaToken === mediaGeneration.current) { mediaBusy.current = false; if (mounted.current) setOpeningCamera(false); } }
  }

  function cancelCamera() {
    stopMedia();
    mediaBusy.current = false; setOpeningCamera(false);
  }

  const resetBlocked = restoring || storageBlocked || creating || uploading || pendingUpload || recording || openingCamera;

  const phase: Phase = creating ? "creating" : recording ? "recording" : uploading ? "uploading" : report
    ? location === "locating" ? "locating" : location === "failed" ? "location-failed" : evidence.length ? "completed" : location === "idle" ? "report-created" : "ready-for-evidence"
    : error ? "error" : "ready";
  return <section className="min-w-0 space-y-[18px]" data-phase={phase}>
    <div className="flex min-h-[382px] flex-col items-center justify-center rounded-[14px] border border-[#ffcbce] bg-linear-to-b from-white to-[#fffafb] px-5 py-9 text-center shadow-[0_2px_5px_rgba(39,58,80,0.05)] sm:px-9 sm:py-[38px]">
      {!report ? <>
        <span className="mb-5 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#fff0f1] text-[#ed242b]"><EmergencyIcon name="alert" className="h-9 w-9" /></span>
        <h2 className="text-[21px] font-bold tracking-tight text-[#19344d] sm:text-[23px]">Butuh bantuan sekarang?</h2>
        <p className="mt-3 max-w-[580px] text-[13px] leading-[1.7] text-[#79899f]">Tekan tombol ini untuk mengirim laporan darurat. Kamera serta mikrofon dapat digunakan setelah laporan tersimpan dan izin perangkat tersedia.</p>
        <button type="button" onClick={() => void createSOS()} disabled={creating || restoring || resumeFailed || storageBlocked} className="mt-6 inline-flex min-h-[76px] w-full max-w-[360px] items-center justify-center gap-3 rounded-[14px] bg-[#e82025] px-4 py-5 text-base font-bold tracking-[0.035em] text-white shadow-[0_12px_25px_rgba(232,32,37,0.17)] transition-colors hover:bg-[#d71b21] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-[20px]"><EmergencyIcon name="alert" className="h-7 w-7 shrink-0" />{creating ? "MENGIRIM…" : restoring ? "MEMULIHKAN…" : "TOMBOL DARURAT"}</button>
        <p className="mt-4 text-[10px] leading-5 text-[#8191a5]">{storageBlocked || resumeFailed ? "Pulihkan dan verifikasi aktivasi sebelumnya terlebih dahulu. Pengiriman SOS diblokir." : error ? "Untuk hasil yang belum pasti, tekan tombol darurat lagi untuk mengirim ulang key yang sama." : "Laporan awal dibuat segera sebelum permintaan izin perangkat."}</p>
      </> : <div role="status" aria-live="polite">
        <span className="mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#e7f5f3] text-[#108980]"><EmergencyIcon name="shield" className="h-9 w-9" /></span>
        <h2 className="text-xl font-bold text-[#087e76]">Laporan SOS sudah tersimpan</h2>
        <p className="mt-3 break-all text-2xl font-bold text-[#19344d]">{report.nomorKasus}</p>
        <p className="mt-3 text-[13px] text-[#79899f]">Waktu server: <time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString("id-ID")}</time></p>
        <p className="mt-3 text-[13px] leading-6 text-[#79899f]">Kegagalan lokasi atau bukti tidak membatalkan laporan ini.</p>
        <div className="mt-6 border-t border-[#f2dfe0] pt-5">
          <button type="button" onClick={beginNewActivation} disabled={resetBlocked} aria-describedby="sos-new-activation-note" className="rounded-lg border border-[#b7cecd] bg-white px-4 py-3 text-sm font-semibold text-[#087e76] hover:bg-[#e7f5f3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50">Laporkan Keadaan Darurat Baru</button>
          <p id="sos-new-activation-note" className="mt-3 max-w-xl text-xs leading-5 text-[#75879e]">Laporan sebelumnya dan bukti tersimpan tetap ada. Tindakan ini hanya menyiapkan aktivasi baru; laporan baru dibuat setelah Anda menekan TOMBOL DARURAT lagi. Pilihan file yang belum diunggah akan dilepas. Lokasi yang masih diproses akan dihentikan pada browser.</p>
          {resetBlocked && <p role="status" className="mt-2 text-xs text-amber-800">{storageBlocked || restoring ? "Verifikasi state aktivasi sebelum memulai SOS baru." : uploading || pendingUpload ? "Upload masih berlangsung atau belum terkonfirmasi. Retry batch yang sama atau verifikasi bukti tersimpan sebelum memulai SOS baru." : "Hentikan rekaman atau batalkan permintaan kamera sebelum memulai SOS baru."}</p>}
        </div>
      </div>}
      {error && <p role="alert" className="mt-4 text-sm text-rose-800">{error}</p>}
      {(resumeFailed || storageBlocked || pendingUpload) && <button className={`${button} mt-3`} onClick={() => window.location.reload()}>Coba verifikasi laporan lagi</button>}
      {recoveryHref && <button className={`${button} mt-3`} onClick={() => router.replace(recoveryHref)}>Pulihkan aktivasi yang tersimpan di browser</button>}
      {storageWarning && <p role="alert" className="mt-4 text-sm text-amber-800">{storageWarning}</p>}
    </div>
    <aside className="flex gap-3 rounded-[14px] border border-[#c3e5e1] bg-[#e7f5f3] px-5 py-4" role="note" aria-labelledby="sos-device-privacy">
      <EmergencyIcon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-[#09877e]" />
      <div><h2 id="sos-device-privacy" className="text-[11px] font-bold text-[#244458]">Izin dan privasi perangkat</h2><p className="mt-1.5 max-w-[850px] text-[10px] leading-[1.65] text-[#778da2]">Browser akan meminta izin kamera dan mikrofon saat Anda memilih rekaman setelah laporan tersimpan. Perekaman hanya dimulai setelah Anda memberi izin dan dapat dihentikan kapan saja. Akses laporan dibatasi untuk pelapor dan petugas Satgas PPKS berwenang.</p></div>
    </aside>
    {report && <>
      <section className="rounded-[14px] border border-[#dfe7ee] bg-white p-5 shadow-[0_2px_5px_rgba(39,58,80,0.03)]" aria-labelledby="sos-location">
        <h2 id="sos-location" className="font-bold text-[#19344d]">Lokasi GPS</h2>
        <p className="my-3 text-sm leading-6 text-[#75879e]" role="status">{locationMessage}</p>
        <button className={button} disabled={location === "locating"} onClick={() => void locate()}>{location === "locating" ? "Mengambil lokasi…" : "Coba / perbarui GPS"}</button>
      </section>
      <section className="min-w-0 space-y-4 rounded-[14px] border border-[#dfe7ee] bg-white p-5 shadow-[0_2px_5px_rgba(39,58,80,0.03)]" aria-labelledby="sos-evidence">
        <h2 id="sos-evidence" className="font-bold">Bukti foto atau video (opsional)</h2>
        <p className="text-sm text-slate-600">Maksimal 5 bukti per laporan, 20 MiB per file. JPEG, PNG, WEBP, MP4, WEBM, MOV. Bukti diakses secara privat.</p>
        <fieldset disabled={uploading || recording || openingCamera || (pendingUpload && files.length > 0) || evidence.length + files.length >= 5} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Ambil foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-2 block w-full text-xs" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>
          <label className="block text-sm font-semibold">Ambil video dengan kamera perangkat<input type="file" accept="video/mp4,video/webm,video/quicktime" capture="environment" className="mt-2 block w-full text-xs" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>
          <label className="block text-sm font-semibold sm:col-span-2">Pilih foto/video yang sudah ada<input type="file" multiple accept={ACCEPT} className="mt-2 block w-full text-xs" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>
        </fieldset>
        <video ref={videoRef} autoPlay muted playsInline className={recording ? "max-h-72 w-full rounded-lg bg-black" : "hidden"} aria-label="Pratinjau kamera rekaman SOS" />
        <div className="flex flex-wrap gap-3">
          <button className={button} disabled={recording || openingCamera || uploading || pendingUpload || evidence.length + files.length >= 5} onClick={() => void startRecording()}>{openingCamera ? "Meminta izin…" : "Mulai rekam video + suara"}</button>
          {recording && <button className="rounded-lg bg-rose-700 px-4 py-3 text-sm font-semibold text-white" onClick={stopMedia}>Stop rekaman</button>}
          {openingCamera && <button className={button} onClick={cancelCamera}>Batalkan permintaan kamera</button>}
        </div>
        <p className="text-xs text-slate-600">Rekaman langsung maksimal 60 detik. Kamera/mikrofon hanya diminta setelah Anda menekan mulai.</p>
        {files.length > 0 && <ul className="space-y-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span className="break-all">{file.name} — {sizeLabel(file.size)} — {uploading ? "mengunggah" : "siap / dapat dicoba ulang"}</span><button disabled={uploading || recording} onClick={() => { setFiles(current => current.filter((_, position) => position !== index)); if (!pendingUploadRef.current) uploadKey.current = null; }} className="font-semibold text-rose-700">Lepas dari pilihan</button></li>)}</ul>}
        <button className={button} disabled={!files.length || uploading || recording || openingCamera || storageBlocked || restoring} onClick={() => void upload()}>{uploading ? "Mengunggah…" : "Unggah / coba ulang bukti"}</button>
        <p role="status" className="text-sm">{uploadMessage}</p>
        {evidence.length > 0 && <div><h3 className="text-sm font-bold">Bukti tersimpan ({evidence.length}/5)</h3><ul className="mt-2 space-y-2">{evidence.map(item => <li key={item.idBukti} className="text-sm"><a className="break-all font-semibold text-teal-700 underline" href={`/api/laporan/bukti/${encodeURIComponent(item.idBukti)}`}>{item.namaFile}</a> — tersimpan</li>)}</ul></div>}
      </section>
    </>}
  </section>;
}
