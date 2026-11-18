import { z } from "zod";
import { caseOptionSchema, createSchema, examinationSchema, idSchema, recoverySchema, requestKeySchema, type CaseOption, type CreateInput, type Examination } from "./contracts";
import { createRequestId, sameExaminationCore } from "./create-identity";

const attemptSchema = z.object({
  version: z.literal(1), ownerId: idSchema, report: caseOptionSchema.strict(),
  key: requestKeySchema, payload: createSchema,
}).strict();
export type PendingCreate = z.infer<typeof attemptSchema>;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type CreateState = {
  phase: "loading" | "ready" | "pending" | "blocked";
  attempt: PendingCreate | null;
  busy: boolean;
  canRetry: boolean;
  message: string;
  confirmation: number;
  confirmed: Examination | null;
};
export const initialCreateState = (): CreateState => ({
  phase: "loading", attempt: null, busy: false, canRetry: false,
  message: "", confirmation: 0, confirmed: null,
});

const storageKey = (ownerId: string) => `safe-space:us05:create:v1:${ownerId}`;
function readAttempt(storage: StorageLike, ownerId: string): PendingCreate | null {
  const raw = storage.getItem(storageKey(ownerId));
  if (raw === null) return null;
  if (raw.length > 1_000_000) throw new Error("Invalid journal");
  const attempt = attemptSchema.parse(JSON.parse(raw));
  if (attempt.ownerId !== ownerId) throw new Error("Wrong journal owner");
  return attempt;
}

type Dependencies = {
  storage: () => StorageLike;
  onChange: (state: CreateState) => void;
  fetch?: typeof fetch;
  randomKey?: () => string;
  timeoutMs?: number;
};

// A journal is written before dispatch, survives reload, and never triggers POST
// on restore. All state changes are observable in offline tests without a browser.
export class CreateRecovery {
  private state: CreateState = initialCreateState();
  private lock = false;
  private disposed = false;
  private controller: AbortController | null = null;

  constructor(private readonly ownerId: string, private readonly deps: Dependencies) {}

  snapshot() { return this.state; }

  private publish(update: Partial<CreateState>) {
    this.state = { ...this.state, ...update };
    if (!this.disposed) this.deps.onChange(this.state);
  }

  restore() {
    try {
      const attempt = readAttempt(this.deps.storage(), this.ownerId);
      this.publish({ phase: attempt ? "pending" : "ready", attempt, canRetry: false,
        message: attempt ? "Ada percobaan penyimpanan yang belum terkonfirmasi. Verifikasi hasil sebelum mengirim catatan baru." : "" });
    } catch {
      this.publish({ phase: "blocked", message: "Penyimpanan pemulihan browser tidak tersedia atau datanya tidak valid. Pengiriman diblokir; jangan menghapus data pemulihan sebelum ditinjau." });
    }
  }

  dispose() {
    this.disposed = true;
    this.controller?.abort();
    // Deliberately keep the journal; unmount/abort does not prove rollback.
  }

  private removeMatching(attempt: PendingCreate) {
    const storage = this.deps.storage();
    const current = readAttempt(storage, this.ownerId);
    if (current && (current.key !== attempt.key || current.report.idLaporan !== attempt.report.idLaporan)) throw new Error("Journal conflict");
    if (current) storage.removeItem(storageKey(this.ownerId));
    if (storage.getItem(storageKey(this.ownerId)) !== null) throw new Error("Journal removal failed");
  }

  private async exchange(method: "GET" | "POST", attempt: PendingCreate) {
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), this.deps.timeoutMs ?? 20_000);
    try {
      const response = await (this.deps.fetch ?? fetch)(
        `/satgas-ppks/us-05/api/kasus/${encodeURIComponent(attempt.report.idLaporan)}/hasil-pemeriksaan`, {
          method, credentials: "same-origin", cache: "no-store", redirect: "error", signal: controller.signal,
          headers: { "Idempotency-Key": attempt.key, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
          ...(method === "POST" ? { body: JSON.stringify(attempt.payload) } : {}),
        },
      );
      const body: unknown = await response.json();
      return { response, body };
    } finally {
      clearTimeout(timer);
      if (this.controller === controller) this.controller = null;
    }
  }

  private async confirm(record: Examination, attempt: PendingCreate) {
    const expectedId = await createRequestId(this.ownerId, attempt.report.idLaporan, attempt.key);
    if (record.idHasil !== expectedId || record.laporanId !== attempt.report.idLaporan || !sameExaminationCore(record, attempt.payload)) {
      throw new Error("Recovery identity or content mismatch");
    }
    this.removeMatching(attempt);
    this.publish({ phase: "ready", attempt: null, canRetry: false, confirmed: record,
      confirmation: this.state.confirmation + 1,
      message: "Hasil pemeriksaan terkonfirmasi tersimpan. Form dan riwayat diperbarui; status utama kasus tetap dipertahankan." });
  }

  async submit(report: CaseOption, payload: CreateInput) {
    if (this.lock || this.disposed || this.state.phase !== "ready") return false;
    this.lock = true;
    try {
      const storage = this.deps.storage();
      const prior = readAttempt(storage, this.ownerId);
      if (prior) {
        this.publish({ phase: "pending", attempt: prior, canRetry: false, message: "Percobaan sebelumnya harus dipulihkan dahulu." });
        return false;
      }
      const attempt = attemptSchema.parse({
        version: 1, ownerId: this.ownerId, report, payload,
        key: this.deps.randomKey ? this.deps.randomKey() : crypto.randomUUID(),
      });
      const encoded = JSON.stringify(attempt);
      storage.setItem(storageKey(this.ownerId), encoded);
      if (storage.getItem(storageKey(this.ownerId)) !== encoded) throw new Error("Journal write failed");
      this.publish({ phase: "pending", attempt, busy: true, canRetry: false, confirmed: null, message: "Menyimpan hasil pemeriksaan…" });
      return await this.send(attempt, true);
    } catch {
      // Nothing is sent until the journal has been durably written and verified.
      this.publish({ phase: "blocked", message: "Data pemulihan belum dapat disimpan atau diverifikasi. Form dipertahankan dan POST tidak dikirim." });
      return false;
    } finally { this.lock = false; this.publish({ busy: false }); }
  }

  private async send(attempt: PendingCreate, fresh: boolean) {
    try {
      const { response, body } = await this.exchange("POST", attempt);
      const rejected = z.object({ success: z.literal(false), code: z.literal("US05_CREATE_NOT_WRITTEN") }).safeParse(body);
      // A rejection on a retry cannot prove an earlier ambiguous call did not commit.
      if (fresh && [400, 401, 403, 404, 413, 415].includes(response.status) && rejected.success) {
        this.removeMatching(attempt);
        this.publish({ phase: "ready", attempt: null, canRetry: false,
          message: "Permintaan ditolak sebelum penulisan. Isian tetap tersedia; perbaiki input atau akses lalu simpan kembali." });
        return false;
      }
      const result = z.object({ success: z.literal(true), data: examinationSchema }).safeParse(body);
      if (!response.ok || !result.success) throw new Error("Unconfirmed response");
      await this.confirm(result.data.data, attempt);
      return true;
    } catch {
      this.publish({ phase: "pending", attempt,
        message: "Hasil penyimpanan belum diketahui. Input dan identitas percobaan dipertahankan. Verifikasi hasil; jangan membuat catatan pengganti." });
      return false;
    }
  }

  async verify() {
    const attempt = this.state.attempt;
    if (!attempt || this.lock || this.disposed) return false;
    this.lock = true; this.publish({ busy: true });
    try {
      const { response, body } = await this.exchange("GET", attempt);
      const result = z.object({ success: z.literal(true), data: recoverySchema }).safeParse(body);
      if (!response.ok || !result.success) throw new Error("Unconfirmed recovery");
      if (result.data.data.state === "CONFIRMED") {
        await this.confirm(result.data.data.record, attempt);
        return true;
      }
      this.publish({ phase: "pending", canRetry: true,
        message: "Catatan belum ditemukan untuk identitas ini. Ini bukan bukti penyimpanan gagal. Anda dapat mengirim ulang percobaan yang sama secara eksplisit; server akan mengenali replay." });
      return false;
    } catch {
      this.publish({ phase: "pending", message: "Hasil belum dapat diverifikasi. Percobaan dan isian tetap dipertahankan." });
      return false;
    } finally { this.lock = false; this.publish({ busy: false }); }
  }

  async retry() {
    const attempt = this.state.attempt;
    if (!attempt || !this.state.canRetry || this.lock || this.disposed) return false;
    this.lock = true; this.publish({ busy: true });
    try { return await this.send(attempt, false); }
    finally { this.lock = false; this.publish({ busy: false }); }
  }
}
