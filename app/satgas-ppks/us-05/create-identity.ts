import type { CreateInput, Examination } from "./contracts";

// Existing VARCHAR(30) primary key; legacy requests still use Prisma's CUID default.
// Lowercase hex avoids collation-dependent case folding. Scope includes server actor.
export async function createRequestId(ownerId: string, laporanId: string, key: string) {
  const material = JSON.stringify(["SAFE_SPACE_US05_CREATE", 1, ownerId, laporanId, key]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 30);
}

// Action realization may legitimately change after creation. A replay never
// restores original action values; compare only the immutable examination core.
export function sameExaminationCore(record: Examination, input: CreateInput) {
  return record.tanggalPemeriksaan === new Date(input.tanggalPemeriksaan).toISOString() &&
    record.hasil === input.hasil && record.kesimpulan === input.kesimpulan &&
    record.keputusan === input.keputusan && record.tindakLanjut === input.tindakLanjut;
}
