import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { webcrypto } from "node:crypto";

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, "../../..");
const collection = "api/kasus/[idLaporan]/hasil-pemeriksaan/route.ts";
const update = "api/kasus/[idLaporan]/hasil-pemeriksaan/[idHasil]/route.ts";
const input = {
  tanggalPemeriksaan: "2026-11-18T09:30:00+07:00",
  hasil: "Catatan sidang sintetis", kesimpulan: "Kesimpulan sintetis",
  keputusan: "TERBUKTI", tindakLanjut: "Rencana sintetis",
  realisasiTindakan: "Tindakan sintetis sudah dilaksanakan",
  tanggalTindakan: "2026-11-18T11:00:00+07:00", detailTindakan: "Detail sintetis",
};
const clone = (value) => JSON.parse(JSON.stringify(value));

function harness(options = {}) {
  const calls = [], writes = [];
  const records = options.records ?? new Map();
  let failedAfterCommit = false;
  const account = { idSatgasPPKS: options.ownerId ?? "satgas-session", nama: "Petugas Sintetis" };
  const row = (data = {}) => ({
    ...input, tanggalPemeriksaan: new Date(input.tanggalPemeriksaan),
    tanggalTindakan: new Date(input.tanggalTindakan),
    idHasil: "hasil-a", laporanId: "kasus-a", satgas: { nama: account.nama }, ...data,
  });
  const db = {
    satgasPPKS: { findUnique: async (args) => { calls.push(["account", args]); return options.missingAccount ? null : account; } },
    laporan: {
      findUnique: async (args) => { calls.push(["case", args]); return options.missingCase ? null : { idLaporan: args.where.idLaporan, nomorKasus: "SS-TEST-001" }; },
      findMany: async (args) => { calls.push(["cases", args]); return options.cases ?? []; },
    },
    hasilPemeriksaan: {
      findUnique: async (args) => { calls.push(["request", args]); return records.get(args.where.idHasil) ?? null; },
      findMany: async (args) => { calls.push(["history", args]); return options.history ?? []; },
      findFirst: async (args) => { calls.push(["result", args]); return options.missingResult ? null : { idHasil: "hasil-a" }; },
      create: async (args) => {
        if (options.databaseError) throw new Error(options.databaseError);
        if (options.createBarrier) await options.createBarrier();
        if (options.p2002WithoutRecord || (args.data.idHasil && records.has(args.data.idHasil))) {
          throw Object.assign(new Error("Synthetic unique conflict"), { code: "P2002", meta: { target: options.p2002WithoutRecord ? "other_constraint" : "PRIMARY" } });
        }
        const { satgasId, ...data } = args.data;
        assert.equal(satgasId, account.idSatgasPPKS);
        writes.push(["create", args]);
        if (data.idHasil) records.set(data.idHasil, { ...row(data), satgasId });
        if (options.failAfterCommit && !failedAfterCommit) { failedAfterCommit = true; throw new Error("Synthetic commit acknowledgement lost"); }
        return row(data);
      },
      update: async (args) => { writes.push(["update", args]); return row(args.data); },
    },
    $transaction: async (fn) => fn(db),
  };
  const cache = new Map();
  function load(file) {
    const absolute = resolve(root, file);
    const enumPath = resolve(repo, "app/generated/prisma/enums.ts");
    const iconPath = resolve(repo, "app/satgas-ppks/components/icons.tsx");
    assert.ok(absolute.startsWith(root + sep) || absolute === enumPath || absolute === iconPath, "Only approved source modules may be evaluated");
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const compiled = { exports: {} }; cache.set(absolute, compiled);
    const output = ts.transpileModule(readFileSync(absolute, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: absolute,
    }).outputText;
    function scopedRequire(name) {
      if (name === "@/lib/prisma") return { __esModule: true, default: db };
      if (name === "@/lib/auth") return { authOptions: {} };
      if (name === "next-auth") return { getServerSession: async () => options.session === null ? null : { user: { id: account.idSatgasPPKS, role: options.role ?? "SATGAS" } } };
      if (name === "next/server") return { NextResponse: { json: (data, init) => Response.json(data, init) } };
      if (name === "next-auth/react") return { signOut: () => { throw new Error("No live auth allowed"); } };
      if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
      if (name === "@/app/generated/prisma/enums") return load(enumPath);
      if (name.startsWith(".")) {
        const target = resolve(dirname(absolute), name);
        return load(target + (name.includes("components/") && name.endsWith("icons") ? ".tsx" :
          ["portal-frame", "examination-form"].some((suffix) => name.endsWith(suffix)) ? ".tsx" : ".ts"));
      }
      if (name === "react" && options.hooks) return options.hooks;
      if (["zod", "react", "react/jsx-runtime"].includes(name)) return require(name);
      throw new Error(`Unexpected import in offline harness: ${name}`);
    }
    const fn = vm.runInNewContext(`(function(require,module,exports){${output}\n})`, {
      Response, Request, URL, TextDecoder, Uint8Array, Set, Object, console,
      FormData: options.FormData ?? FormData,
      TextEncoder, crypto: webcrypto, AbortController, setTimeout, clearTimeout,
    }, { filename: absolute });
    fn(scopedRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return { load, calls, writes, row, records };
}

function request(method = "POST", body = input, options = {}) {
  return new Request("http://localhost:3105/satgas-ppks/us-05/api/kasus/kasus-a/hasil-pemeriksaan", {
    method, headers: { "Content-Type": "application/json", Origin: "http://localhost:3105", ...options.headers },
    ...(method === "GET" ? {} : { body: options.raw ?? JSON.stringify(body) }),
  });
}
const context = (idLaporan = "kasus-a", idHasil = "hasil-a") => ({ params: Promise.resolve({ idLaporan, idHasil }) });

for (const [label, config, expected] of [
  ["tanpa session", { session: null }, 401],
  ["role PELAPOR", { role: "PELAPOR" }, 403],
  ["akun Satgas tidak tersedia", { missingAccount: true }, 403],
]) {
  for (const [file, method] of [["api/kasus/route.ts", "GET"], [collection, "GET"], [collection, "POST"], [update, "PATCH"]]) {
    test(`${method} ${file}: menolak ${label}`, async () => {
      const h = harness(config);
      const response = await h.load(file)[method](request(method), context());
      assert.equal(response.status, expected);
      assert.equal(h.writes.length, 0);
      assert.ok(h.calls.every(([kind]) => kind === "account"));
    });
  }
}

test("Satgas valid mendapat daftar nyata kosong tanpa fallback dummy atau PII", async () => {
  const h = harness();
  const response = await h.load("api/kasus/route.ts").GET(request("GET"));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { items: [], nextCursor: null });
  const [, args] = h.calls.find(([kind]) => kind === "cases");
  assert.deepEqual(clone(args.select), { idLaporan: true, nomorKasus: true, jenis: true, status: true });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("pencarian dan pagination kasus memakai parameter tervalidasi", async () => {
  const cases = Array.from({ length: 26 }, (_, i) => ({ idLaporan: `kasus-${i}`, nomorKasus: "TEST", jenis: "REGULER", status: "DITERIMA" }));
  const h = harness({ cases });
  const response = await h.load("api/kasus/route.ts").GET(new Request("http://localhost:3105/?q=TEST&cursor=kasus-previous"));
  const data = (await response.json()).data;
  assert.equal(data.items.length, 25); assert.equal(data.nextCursor, "kasus-24");
  const args = h.calls.find(([kind]) => kind === "cases")[1];
  assert.deepEqual(clone(args.where), { nomorKasus: { contains: "TEST" } });
  assert.deepEqual(clone(args.cursor), { idLaporan: "kasus-previous" });
  assert.equal(args.skip, 1);
});

for (const qs of ["q=a&q=b", "unexpected=true", `q=${"a".repeat(101)}`]) {
  test(`parameter daftar kasus tidak valid ditolak (${qs.slice(0, 22)})`, async () => {
    const h = harness();
    assert.equal((await h.load("api/kasus/route.ts").GET(new Request(`http://localhost:3105/?${qs}`))).status, 400);
    assert.ok(!h.calls.some(([kind]) => kind === "cases"));
  });
}

test("POST menyimpan seluruh kontrak dengan kasus URL dan Satgas session", async () => {
  const h = harness();
  const response = await h.load(collection).POST(request(), context("kasus-b"));
  assert.equal(response.status, 201);
  const result = (await response.json()).data;
  assert.equal(result.laporanId, "kasus-b"); assert.equal(result.keputusan, input.keputusan);
  assert.equal(result.kesimpulan, input.kesimpulan);
  assert.equal(result.tanggalPemeriksaan, new Date(input.tanggalPemeriksaan).toISOString());
  assert.equal(result.tanggalTindakan, new Date(input.tanggalTindakan).toISOString());
  for (const key of ["hasil", "kesimpulan", "tindakLanjut", "realisasiTindakan", "detailTindakan"]) assert.equal(result[key], input[key]);
  const data = clone(h.writes[0][1].data);
  assert.deepEqual(Object.keys(data).sort(), [...Object.keys(input), "laporanId", "satgasId"].sort());
  assert.equal(data.satgasId, "satgas-session");
  assert.equal(h.writes.length, 1);
});

test("POST menerima tindakan opsional null dan tidak mewajibkan realisasi saat perencanaan", async () => {
  const h = harness();
  const body = { ...input }; delete body.realisasiTindakan; delete body.detailTindakan; delete body.tanggalTindakan;
  const response = await h.load(collection).POST(request("POST", body), context());
  assert.equal(response.status, 201);
  const result = (await response.json()).data;
  for (const key of ["realisasiTindakan", "detailTindakan", "tanggalTindakan"]) assert.equal(result[key], null);
});

for (const field of ["tanggalPemeriksaan", "hasil", "kesimpulan", "keputusan", "tindakLanjut"]) {
  test(`POST menolak field wajib kosong: ${field}`, async () => {
    const h = harness();
    assert.equal((await h.load(collection).POST(request("POST", { ...input, [field]: "" }), context())).status, 400);
    assert.equal(h.writes.length, 0);
  });
}
for (const body of [
  { ...input, keputusan: "SELESAI" }, { ...input, tanggalPemeriksaan: "2026-02-30T00:00:00Z" },
  { ...input, tanggalTindakan: "bukan-tanggal" }, { ...input, hasil: " " },
  { ...input, hasil: "a".repeat(10_001) }, { ...input, satgasId: "pemalsuan" },
  { ...input, laporanId: "kasus-lain" }, { ...input, status: "SELESAI" },
]) {
  test(`POST menolak enum/tanggal/field tidak sah #${Object.keys(body).join("-").length}-${JSON.stringify(body).length}`, async () => {
    const h = harness();
    assert.equal((await h.load(collection).POST(request("POST", body), context())).status, 400);
    assert.equal(h.writes.length, 0);
  });
}

for (const [label, options, expected] of [
  ["origin lain", { headers: { Origin: "https://lain.test" } }, 403],
  ["cross-site", { headers: { "Sec-Fetch-Site": "cross-site" } }, 403],
  ["content type bukan JSON", { headers: { "Content-Type": "text/plain" } }, 415],
  ["JSON rusak", { raw: "{" }, 400],
  ["body berlebihan", { raw: "a".repeat(250_001) }, 413],
]) {
  test(`POST menolak ${label} sebelum mutasi`, async () => {
    const h = harness();
    assert.equal((await h.load(collection).POST(request("POST", input, options), context())).status, expected);
    assert.equal(h.writes.length, 0);
  });
}

test("kasus tidak ditemukan menolak create dan history", async () => {
  const h = harness({ missingCase: true });
  const api = h.load(collection);
  assert.equal((await api.POST(request(), context())).status, 404);
  assert.equal((await api.GET(request("GET"), context())).status, 404);
  assert.equal(h.writes.length, 0);
});

test("history difilter ke kasus URL, memuat pencatat, dan mendukung pagination", async () => {
  const h = harness();
  const rows = Array.from({ length: 21 }, (_, i) => h.row({ idHasil: `hasil-${i}`, laporanId: "kasus-b" }));
  const other = harness({ history: rows });
  const response = await other.load(collection).GET(new Request("http://localhost:3105/?cursor=hasil-previous"), context("kasus-b"));
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(data.items.length, 20); assert.equal(data.nextCursor, "hasil-19");
  assert.ok(data.items.every((row) => row.laporanId === "kasus-b"));
  const args = other.calls.find(([kind]) => kind === "history")[1];
  assert.deepEqual(clone(args.where), { laporanId: "kasus-b" });
  assert.deepEqual(clone(args.select.satgas), { select: { nama: true } });
  assert.equal(args.cursor.idHasil, "hasil-previous");
});

test("PATCH hanya memperbarui realisasi, tanggal, detail; rencana dan status tidak disentuh", async () => {
  const h = harness();
  const body = { realisasiTindakan: "Realisasi baru", tanggalTindakan: null, detailTindakan: "Detail baru" };
  const response = await h.load(update).PATCH(request("PATCH", body), context());
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(data.tindakLanjut, input.tindakLanjut); assert.equal(data.keputusan, input.keputusan);
  assert.equal(data.realisasiTindakan, body.realisasiTindakan);
  assert.deepEqual(clone(h.writes[0][1].data), body);
  assert.deepEqual(clone(h.writes[0][1].where), { idHasil: "hasil-a", laporanId: "kasus-a" });
  assert.deepEqual(clone(h.calls.find(([kind]) => kind === "result")[1].where), { idHasil: "hasil-a", laporanId: "kasus-a" });
});

test("PATCH menolak hasil yang bukan milik kasus pada URL", async () => {
  const h = harness({ missingResult: true });
  const response = await h.load(update).PATCH(request("PATCH", { realisasiTindakan: null, tanggalTindakan: null, detailTindakan: null }), context("kasus-lain"));
  assert.equal(response.status, 404); assert.equal(h.writes.length, 0);
});

for (const extra of ["satgasId", "laporanId", "tindakLanjut", "hasil", "kesimpulan", "keputusan", "status"]) {
  test(`PATCH menolak perubahan di luar tindakan: ${extra}`, async () => {
    const h = harness();
    const response = await h.load(update).PATCH(request("PATCH", { realisasiTindakan: null, tanggalTindakan: null, detailTindakan: null, [extra]: "pemalsuan" }), context());
    assert.equal(response.status, 400); assert.equal(h.writes.length, 0);
  });
}

test("raw database error dan secret sintetis tidak masuk respons", async () => {
  const secret = "SECRET-SYNTHETIC-DO-NOT-EXPOSE";
  const h = harness({ databaseError: `${secret} password SQL internal stack` });
  const response = await h.load(collection).POST(request(), context());
  assert.equal(response.status, 500);
  const text = await response.text();
  assert.ok(!text.includes(secret)); assert.ok(!text.includes("SQL")); assert.ok(!text.includes("stack"));
});

test("seluruh mutasi hanya menggunakan HasilPemeriksaan, tanpa perubahan status/notifikasi/audit", async () => {
  const h = harness();
  await h.load(collection).POST(request(), context());
  await h.load(update).PATCH(request("PATCH", { realisasiTindakan: "Selesai", tanggalTindakan: null, detailTindakan: null }), context());
  assert.deepEqual(h.writes.map(([kind]) => kind), ["create", "update"]);
  // The mock intentionally provides no laporan.update / notifikasi / riwayatPenanganan delegate.
  assert.equal(h.writes.length, 2);
});

test("form memuat seluruh isian Jira dan penguncian saat penyimpanan", () => {
  const h = harness();
  const { ExaminationForm } = h.load("components/examination-form.tsx");
  const html = renderToStaticMarkup(React.createElement(ExaminationForm, { pending: true, onSave: async () => false }));
  for (const field of Object.keys(input)) assert.ok(html.includes(`name="${field}"`));
  assert.ok(html.includes("fieldset disabled"));
  assert.ok(html.includes("Keputusan akhir kasus"));
});

test("form pembaruan hanya mempunyai tiga input tindakan, mempertahankan rencana", () => {
  const h = harness();
  const { ActionForm } = h.load("components/examination-form.tsx");
  const row = clone(h.row());
  const html = renderToStaticMarkup(React.createElement(ActionForm, { record: row, pending: false, onSave: async () => true, onCancel: () => {} }));
  for (const field of ["realisasiTindakan", "tanggalTindakan", "detailTindakan"]) assert.ok(html.includes(`name="${field}"`));
  for (const field of ["hasil", "kesimpulan", "keputusan", "tindakLanjut", "satgasId", "laporanId"]) assert.ok(!html.includes(`name="${field}"`));
});

test("konten baru mempertahankan satu form, field existing, dan nilai keputusan API", () => {
  const h = harness();
  const { ExaminationForm } = h.load("components/examination-form.tsx");
  const html = renderToStaticMarkup(React.createElement(ExaminationForm, {
    pending: false, initialInput: input, reportNumber: "SS-SINTETIS-001", onSave: async () => false,
  }));
  assert.equal((html.match(/<form\b/g) ?? []).length, 1);
  assert.ok(html.includes("lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"));
  for (const label of ["Pencatatan Hasil Pemeriksaan", "Tindakan Lanjutan", "SS-SINTETIS-001", "Simpan Hasil Pemeriksaan"]) assert.ok(html.includes(label));
  const radios = html.match(/<input\b[^>]*type="radio"[^>]*>/g) ?? [];
  assert.equal(radios.length, 4);
  for (const value of ["TERBUKTI", "TIDAK_VALID", "TIDAK_TERBUKTI", "LAINNYA"]) assert.ok(radios.some((radio) => radio.includes(`value="${value}"`)));
  assert.ok(radios.find((radio) => radio.includes('value="TERBUKTI"')).includes("checked"));
  assert.ok(html.includes(">Valid</label>"));
  assert.ok(html.includes(">Tidak Valid</label>"));
  for (const field of Object.keys(input)) assert.ok(html.includes(`name="${field}"`));
  for (const field of ["laporanId", "satgasId", "status"]) assert.ok(!html.includes(`name="${field}"`));
});

test("informasi kasus memakai data existing dan menjelaskan metadata yang belum tersedia", () => {
  const { CaseInformation } = harness().load("us-05-client.tsx");
  const html = renderToStaticMarkup(React.createElement(CaseInformation, {
    report: { idLaporan: "kasus-a", nomorKasus: "SS-SINTETIS-001", jenis: "EMERGENCY", status: "DITANGANI" },
    examinationDate: input.tanggalPemeriksaan, selector: React.createElement("select", { "aria-label": "Nomor kasus" }),
  }));
  for (const text of ["SS-SINTETIS-001", "DITANGANI", "EMERGENCY", "Tanggal pemeriksaan terakhir", "Kategori kasus", "Lokasi kasus", "Tanggal laporan"]) assert.ok(html.includes(text));
  assert.equal((html.match(/Belum tersedia dari data kasus/g) ?? []).length, 3);
  assert.ok(html.includes("belum tersedia pada halaman ini"));
  assert.equal((html.match(/<select\b/g) ?? []).length, 1);
  assert.ok(!html.includes("25 Februari 2025"));
});

test("riwayat tampil sebagai tabel dengan ringkasan aman dan aksi yang membuka ID hasil terkait", () => {
  const h = harness();
  const { ExaminationHistoryTable } = h.load("us-05-client.tsx");
  const row = clone(h.row({ hasil: "<script>contoh</script>", kesimpulan: "<b>Ringkasan sintetis</b>" }));
  const viewed = [];
  const props = { reportNumber: "SS-SINTETIS-001", rows: [row], viewing: null, onView: (id) => viewed.push(id) };
  const html = renderToStaticMarkup(React.createElement(ExaminationHistoryTable, props));
  for (const label of ["Nomor kasus", "Tanggal pemeriksaan", "Keputusan", "Kesimpulan singkat", "Tindakan lanjutan", "Lihat Hasil"]) assert.ok(html.includes(label));
  assert.ok(html.includes("&lt;b&gt;Ringkasan sintetis&lt;/b&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes('aria-controls="examination-hasil-a"'));
  assert.ok(html.includes('aria-expanded="false"'));
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.type === "button") node.props.onClick();
    visit(node.props.children);
  }
  visit(ExaminationHistoryTable(props));
  assert.deepEqual(viewed, ["hasil-a"]);
  const expanded = renderToStaticMarkup(React.createElement(ExaminationHistoryTable, { ...props, viewing: "hasil-a" }));
  assert.ok(expanded.includes('aria-expanded="true"'));
});

test("halaman awal tetap mempunyai pencarian, pilihan kasus, dan banner tanpa mengarang kasus", () => {
  const Us05Client = harness().load("us-05-client.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Us05Client, { ownerId: "satgas-sintetis", satgasName: "Petugas Sintetis" }));
  for (const label of ["Hasil Pemeriksaan dan Sidang", "Pencatatan hanya untuk petugas Satgas PPKS berwenang", "Cari nomor kasus", "Pilih nomor kasus", "Informasi Kasus"]) assert.ok(html.includes(label));
  assert.ok(html.includes('name="q"'));
  assert.ok(!html.includes("SS-2025-022"));
  assert.equal((html.match(/<header\b/g) ?? []).length, 1);
  assert.equal((html.match(/<aside\b/g) ?? []).length, 1);
});

test("shell memakai identitas dari props, route existing, dan akses fitur lokal", () => {
  const h = harness();
  const PortalFrame = h.load("components/portal-frame.tsx").default;
  const html = renderToStaticMarkup(React.createElement(PortalFrame, { name: "Petugas <Sintetis>" }, "Konten US-05"));
  assert.ok(html.includes("Petugas &lt;Sintetis&gt;"));
  for (const href of ["/satgas-ppks", "/satgas-ppks/daftar-laporan", "/satgas-ppks/us-05"]) assert.ok(html.includes(`href="${href}"`));
  const active = html.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? [];
  assert.equal(active.length, 1);
  assert.ok(active[0].includes('href="/satgas-ppks/us-05"'));
  assert.ok(!html.includes('href="/satgas-ppks/hasil-pemeriksaan"'));
  assert.ok(html.includes("bg-[#f5f8fb] text-[#193652]"));
  assert.ok(html.includes("mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8"));
  assert.equal((html.match(/<aside\b/g) ?? []).length, 1);
  assert.equal((html.match(/<header\b/g) ?? []).length, 1);
  assert.ok(html.includes("Konten US-05"));
});

test("migration baru hanya menambahkan dua kolom nullable", () => {
  const sql = readFileSync(resolve(repo, "prisma/migrations/20261118090000_add_us05_action_details/migration.sql"), "utf8");
  const statements = sql.replace(/--[^\n]*/g, "").trim().split(";").filter((value) => value.trim());
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^ALTER TABLE `HasilPemeriksaan`\s+ADD COLUMN `realisasiTindakan` TEXT NULL,\s+ADD COLUMN `detailTindakan` TEXT NULL$/);
  assert.doesNotMatch(sql, /\b(DROP|DELETE|UPDATE|MODIFY|CREATE TABLE)\b/i);
});

test("schema pembacaan tetap menerima teks data lama tanpa batas form baru", () => {
  const h = harness();
  const { examinationSchema } = h.load("contracts.ts");
  assert.equal(examinationSchema.safeParse({
    ...clone(h.row()), hasil: "a".repeat(15_000), kesimpulan: "", tindakLanjut: "",
    realisasiTindakan: null, detailTindakan: null,
  }).success, true);
});

for (const body of [
  { realisasiTindakan: "Selesai", tanggalTindakan: "2026-02-30T00:00:00Z", detailTindakan: null },
  { realisasiTindakan: "Selesai", tanggalTindakan: null },
  { realisasiTindakan: "a".repeat(10_001), tanggalTindakan: null, detailTindakan: null },
]) {
  test(`PATCH memvalidasi tanggal, kelengkapan, dan panjang teks (${JSON.stringify(body).length})`, async () => {
    const h = harness();
    assert.equal((await h.load(update).PATCH(request("PATCH", body), context())).status, 400);
    assert.equal(h.writes.length, 0);
  });
}

test("penguncian form mencegah double submit sebelum request pertama selesai", async () => {
  const values = { ...input, tanggalPemeriksaan: "2026-11-18T09:30:00", tanggalTindakan: "2026-11-18T11:00:00" };
  const h = harness({
    hooks: { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    FormData: class { get(name) { return values[name] ?? null; } },
  });
  const { ExaminationForm } = h.load("components/examination-form.tsx");
  let release, calls = 0, resets = 0;
  const waiting = new Promise((resolve) => { release = resolve; });
  const form = ExaminationForm({ pending: false, onSave: async () => { calls++; await waiting; return true; } });
  const event = { preventDefault() {}, currentTarget: { reset() { resets++; } } };
  const first = form.props.onSubmit(event);
  await form.props.onSubmit(event);
  assert.equal(calls, 1);
  release(); await first;
  assert.equal(resets, 1);
});

test("form create yang diblokir tidak memanggil callback penyimpanan", async () => {
  const h = harness({ hooks: { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] } });
  const { ExaminationForm } = h.load("components/examination-form.tsx");
  let calls = 0;
  const form = ExaminationForm({ pending: false, blocked: true, onSave: async () => { calls++; return true; } });
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls, 0);
});

const keyA = "11111111-1111-4111-8111-111111111111";
const keyB = "22222222-2222-4222-8222-222222222222";
const report = { idLaporan: "kasus-a", nomorKasus: "SS-TEST-001", jenis: "REGULER", status: "DITERIMA" };
const keyed = (key = keyA, body = input) => request("POST", body, { headers: { "Idempotency-Key": key } });
const recoveryRequest = (key = keyA) => request("GET", null, { headers: { "Idempotency-Key": key } });

function memoryStorage() {
  const entries = new Map();
  let fault = "";
  return {
    entries,
    fault(value) { fault = value; },
    getItem(key) { if (fault === "read") throw new Error("Synthetic storage read denied"); return entries.get(key) ?? null; },
    setItem(key, value) { if (fault === "write") throw new Error("Synthetic storage quota"); entries.set(key, value); },
    removeItem(key) { if (fault === "remove") throw new Error("Synthetic storage removal denied"); entries.delete(key); },
  };
}

function client(h, storage, fetcher, extra = {}) {
  const { CreateRecovery } = h.load("create-recovery.ts");
  const states = [];
  const recovery = new CreateRecovery(extra.ownerId ?? "satgas-session", {
    storage: () => storage, fetch: fetcher, randomKey: () => keyA,
    onChange: (state) => states.push(state), ...extra,
  });
  recovery.restore();
  return { recovery, states };
}

function bridge(h) {
  const api = h.load(collection);
  return async (_url, options) => api[options.method](request(options.method, options.body ? JSON.parse(options.body) : null, { headers: options.headers }), context());
}

test("POST keyed menghasilkan ID 30 karakter; replay tidak menambah catatan", async () => {
  const h = harness(), api = h.load(collection);
  const first = await api.POST(keyed(), context());
  const created = (await first.json()).data;
  assert.equal(first.status, 201); assert.match(created.idHasil, /^[0-9a-f]{30}$/);
  const repeated = await api.POST(keyed(), context());
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).data.idHasil, created.idHasil);
  assert.equal(h.writes.length, 1); assert.equal(h.records.size, 1);
});

test("dua POST paralel bertemu pada primary key dan P2002 dipulihkan sebagai replay", async () => {
  let arrivals = 0, release;
  const waiting = new Promise((resolve) => { release = resolve; });
  const h = harness({ createBarrier: async () => { arrivals++; if (arrivals === 2) release(); await waiting; } });
  const api = h.load(collection);
  const responses = await Promise.all([api.POST(keyed(), context()), api.POST(keyed(), context())]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
  const payloads = await Promise.all(responses.map((response) => response.json()));
  assert.equal(payloads[0].data.idHasil, payloads[1].data.idHasil);
  assert.equal(h.writes.length, 1); assert.equal(h.records.size, 1);
});

test("key sama dengan isi inti berbeda ditolak tanpa menimpa data", async () => {
  const h = harness(), api = h.load(collection);
  await api.POST(keyed(), context());
  const response = await api.POST(keyed(keyA, { ...input, hasil: "Isi berbeda" }), context());
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "US05_CREATE_CONFLICT");
  assert.equal(h.writes.length, 1);
});

test("replay tidak membatalkan realisasi tindakan yang diperbarui sesudah create", async () => {
  const h = harness(), api = h.load(collection);
  const created = (await (await api.POST(keyed(), context())).json()).data;
  h.records.get(created.idHasil).realisasiTindakan = "Realisasi terbaru";
  const response = await api.POST(keyed(), context());
  assert.equal((await response.json()).data.realisasiTindakan, "Realisasi terbaru");
  assert.equal(h.writes.length, 1);
});

test("key identik dari akun lain terisolasi dan tidak membocorkan catatan pertama", async () => {
  const records = new Map();
  const a = harness({ records }), b = harness({ records, ownerId: "satgas-b" });
  const recordA = (await (await a.load(collection).POST(keyed(), context())).json()).data;
  const checkB = await b.load(collection).GET(recoveryRequest(), context());
  assert.deepEqual((await checkB.json()).data, { state: "NOT_CONFIRMED" });
  const recordB = (await (await b.load(collection).POST(keyed(), context())).json()).data;
  assert.notEqual(recordA.idHasil, recordB.idHasil); assert.equal(records.size, 2);
});

test("ID diturunkan dari kasus juga; tidak mencampur hasil kasus lain", async () => {
  const h = harness(), api = h.load(collection);
  const a = (await (await api.POST(keyed(), context())).json()).data;
  const b = (await (await api.POST(keyed(), context("kasus-b"))).json()).data;
  assert.notEqual(a.idHasil, b.idHasil);
  assert.equal(b.laporanId, "kasus-b"); assert.equal(h.records.size, 2);
});

test("recovery menolak record dengan owner/kasus berbeda meski primary key cocok", async () => {
  const h = harness();
  const id = await h.load("create-identity.ts").createRequestId("satgas-session", "kasus-a", keyA);
  h.records.set(id, h.row({ idHasil: id, satgasId: "satgas-lain", laporanId: "kasus-rahasia" }));
  const response = await h.load(collection).GET(recoveryRequest(), context());
  assert.equal(response.status, 409);
  assert.ok(!(await response.text()).includes("kasus-rahasia"));
});

test("P2002 tanpa record primary key yang diminta tidak dianggap replay", async () => {
  const h = harness({ p2002WithoutRecord: true });
  const response = await h.load(collection).POST(keyed(), context());
  assert.equal(response.status, 500);
  assert.equal((await response.json()).code, undefined);
});

for (const [label, options, req, status] of [
  ["validasi", {}, () => keyed(keyA, { ...input, hasil: "" }), 400],
  ["session", { session: null }, () => keyed(), 401],
  ["role", { role: "PELAPOR" }, () => keyed(), 403],
  ["kasus tidak ada", { missingCase: true }, () => keyed(), 404],
  ["origin", {}, () => request("POST", input, { headers: { Origin: "https://lain.test", "Idempotency-Key": keyA } }), 403],
  ["format key", {}, () => keyed("invalid-key"), 400],
]) {
  test(`kode NOT_WRITTEN hanya diterbitkan sebelum create: ${label}`, async () => {
    const h = harness(options);
    const response = await h.load(collection).POST(req(), context());
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, "US05_CREATE_NOT_WRITTEN");
    assert.equal(h.writes.length, 0);
  });
}

test("commit acknowledgement hilang tetap ambigu dan bisa dipulihkan tanpa INSERT kedua", async () => {
  const h = harness({ failAfterCommit: true }), api = h.load(collection);
  const first = await api.POST(keyed(), context());
  assert.equal(first.status, 500); assert.equal((await first.json()).code, undefined);
  const result = (await (await api.GET(recoveryRequest(), context())).json()).data;
  assert.equal(result.state, "CONFIRMED");
  assert.equal((await api.POST(keyed(), context())).status, 200);
  assert.equal(h.writes.length, 1);
});

test("penolakan definitif membuka form, mempertahankan payload pemanggil, dan menghapus journal", async () => {
  const h = harness(), storage = memoryStorage();
  const original = clone(input);
  const { recovery } = client(h, storage, async () => Response.json({ success: false, code: "US05_CREATE_NOT_WRITTEN" }, { status: 400 }));
  assert.equal(await recovery.submit(report, input), false);
  assert.equal(recovery.snapshot().phase, "ready");
  assert.equal(recovery.snapshot().attempt, null); assert.equal(storage.entries.size, 0);
  assert.deepEqual(input, original);
});

test("onSave false akibat validasi server tidak me-reset isi form", async () => {
  const values = { ...input };
  const h = harness({ hooks: { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    FormData: class { get(name) { return values[name] ?? null; } } });
  const storage = memoryStorage();
  const { recovery } = client(h, storage, async () => Response.json({ success: false, code: "US05_CREATE_NOT_WRITTEN" }, { status: 400 }));
  const form = h.load("components/examination-form.tsx").ExaminationForm({ pending: false, onSave: (payload) => recovery.submit(report, payload) });
  let resets = 0;
  await form.props.onSubmit({ preventDefault() {}, currentTarget: { reset() { resets++; } } });
  assert.equal(resets, 0); assert.deepEqual(values, input);
  assert.equal(recovery.snapshot().phase, "ready");
});

for (const [label, fetcher] of [
  ["network error", async () => { throw new Error("Synthetic network credential must not be displayed"); }],
  ["400 tanpa kode", async () => Response.json({ success: false }, { status: 400 })],
  ["500 dengan kode palsu NOT_WRITTEN", async () => Response.json({ success: false, code: "US05_CREATE_NOT_WRITTEN" }, { status: 500 })],
  ["respons bukan JSON", async () => new Response("<html>synthetic raw server body</html>")],
  ["sukses JSON tidak valid", async () => Response.json({ success: true, data: {} })],
  ["redirect", async () => Response.redirect("http://localhost:3105/login", 307)],
]) {
  test(`${label} mempertahankan pending, key, dan payload tanpa raw error`, async () => {
    const h = harness(), storage = memoryStorage();
    const { recovery } = client(h, storage, fetcher);
    assert.equal(await recovery.submit(report, input), false);
    assert.equal(recovery.snapshot().phase, "pending");
    assert.equal(recovery.snapshot().attempt.key, keyA);
    assert.deepEqual(clone(recovery.snapshot().attempt.payload), input);
    assert.equal(storage.entries.size, 1);
    assert.ok(!recovery.snapshot().message.includes("credential"));
    assert.ok(!recovery.snapshot().message.includes("<html>"));
  });
}

test("timeout tetap ambigu dan tidak menghapus journal", async () => {
  const h = harness(), storage = memoryStorage();
  const { recovery } = client(h, storage, (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("Synthetic timeout")), { once: true });
  }), { timeoutMs: 1 });
  assert.equal(await recovery.submit(report, input), false);
  assert.equal(recovery.snapshot().phase, "pending"); assert.equal(storage.entries.size, 1);
});

test("journal tersimpan sebelum POST; reload memulihkan input tanpa otomatis mengirim ulang", async () => {
  const h = harness(), storage = memoryStorage();
  let sends = 0;
  const first = client(h, storage, async () => {
    sends++; assert.equal(storage.entries.size, 1);
    throw new Error("Synthetic network failure");
  }).recovery;
  await first.submit(report, input); first.dispose();
  const second = client(h, storage, async () => { sends++; throw new Error("No automatic request permitted"); }).recovery;
  assert.equal(sends, 1); assert.equal(second.snapshot().phase, "pending");
  assert.equal(second.snapshot().attempt.report.idLaporan, report.idLaporan);
  assert.deepEqual(clone(second.snapshot().attempt.payload), input);
  assert.equal(await second.submit(report, input), false); assert.equal(sends, 1);
  const { ExaminationForm } = h.load("components/examination-form.tsx");
  const html = renderToStaticMarkup(React.createElement(ExaminationForm, { pending: false, blocked: true, initialInput: second.snapshot().attempt.payload, onSave: async () => false }));
  for (const text of [input.hasil, input.kesimpulan, input.tindakLanjut, input.realisasiTindakan, input.detailTindakan]) assert.ok(html.includes(text));
});

test("GET belum menemukan hasil tidak membuka form; retry eksplisit memakai key dan payload lama", async () => {
  const h = harness(), storage = memoryStorage(), seen = [];
  const { recovery } = client(h, storage, async (_url, options) => {
    seen.push(clone({ method: options.method, key: options.headers["Idempotency-Key"], body: options.body }));
    if (options.method === "GET") return Response.json({ success: true, data: { state: "NOT_CONFIRMED" } });
    throw new Error("Synthetic lost response");
  });
  await recovery.submit(report, input);
  assert.equal(await recovery.retry(), false); assert.equal(seen.length, 1);
  await recovery.verify();
  assert.equal(recovery.snapshot().phase, "pending"); assert.equal(recovery.snapshot().canRetry, true);
  assert.equal(await recovery.submit(report, input), false);
  await recovery.retry();
  assert.deepEqual(seen.map((item) => item.method), ["POST", "GET", "POST"]);
  assert.equal(seen[0].key, seen[2].key); assert.equal(seen[0].body, seen[2].body);
  assert.equal(storage.entries.size, 1);
});

test("penolakan definitif pada retry tidak membuktikan percobaan lama gagal", async () => {
  const h = harness(), storage = memoryStorage(); let posts = 0;
  const { recovery } = client(h, storage, async (_url, options) => {
    if (options.method === "GET") return Response.json({ success: true, data: { state: "NOT_CONFIRMED" } });
    if (++posts === 1) throw new Error("Synthetic lost response");
    return Response.json({ success: false, code: "US05_CREATE_NOT_WRITTEN" }, { status: 401 });
  });
  await recovery.submit(report, input); await recovery.verify(); await recovery.retry();
  assert.equal(recovery.snapshot().phase, "pending"); assert.equal(storage.entries.size, 1);
});

test("respons create hilang setelah tersimpan: reload + verifikasi mengonfirmasi tanpa POST kedua", async () => {
  const h = harness(), storage = memoryStorage(), apiFetch = bridge(h); let posts = 0;
  const first = client(h, storage, async (url, options) => { posts++; await apiFetch(url, options); throw new Error("Synthetic response lost"); }).recovery;
  await first.submit(report, input); first.dispose();
  const second = client(h, storage, apiFetch).recovery;
  assert.equal(await second.verify(), true);
  assert.equal(posts, 1); assert.equal(h.writes.length, 1);
  assert.equal(second.snapshot().phase, "ready"); assert.equal(second.snapshot().confirmation, 1);
  assert.equal(second.snapshot().attempt, null); assert.equal(storage.entries.size, 0);
});

test("GET lebih awal kosong lalu POST lama commit: retry tetap mengembalikan satu record", async () => {
  const h = harness(), storage = memoryStorage(), apiFetch = bridge(h);
  let held;
  const { recovery } = client(h, storage, async (url, options) => {
    if (options.method === "POST" && !held) { held = [url, options]; throw new Error("Synthetic request still pending remotely"); }
    return apiFetch(url, options);
  });
  await recovery.submit(report, input); await recovery.verify();
  assert.equal(recovery.snapshot().phase, "pending"); assert.equal(h.writes.length, 0);
  await apiFetch(...held);
  assert.equal(await recovery.retry(), true);
  assert.equal(h.writes.length, 1); assert.equal(h.records.size, 1);
  assert.equal(recovery.snapshot().phase, "ready");
});

test("sukses terkonfirmasi membuka form, memberi record terbaru, dan membersihkan journal", async () => {
  const h = harness(), storage = memoryStorage();
  const { recovery } = client(h, storage, bridge(h));
  assert.equal(await recovery.submit(report, input), true);
  assert.equal(recovery.snapshot().phase, "ready");
  assert.equal(recovery.snapshot().confirmed.hasil, input.hasil);
  assert.equal(recovery.snapshot().confirmed.laporanId, report.idLaporan);
  assert.equal(recovery.snapshot().confirmation, 1); assert.equal(storage.entries.size, 0);
});

for (const fault of ["read", "write"]) {
  test(`storage ${fault} gagal: tidak ada POST atau penggantian percobaan diam-diam`, async () => {
    const h = harness(), storage = memoryStorage(); let sends = 0;
    const { recovery } = client(h, storage, async () => { sends++; throw new Error("Must not run"); });
    storage.fault(fault);
    assert.equal(await recovery.submit(report, input), false);
    assert.equal(sends, 0); assert.equal(recovery.snapshot().phase, "blocked");
  });
}

test("storage corrupt atau owner tidak cocok diblokir tanpa menghapus payload lama", () => {
  const h = harness(), storage = memoryStorage(); let sends = 0;
  storage.entries.set("safe-space:us05:create:v1:satgas-session", "{invalid");
  const { recovery } = client(h, storage, async () => { sends++; throw new Error("Must not run"); });
  assert.equal(recovery.snapshot().phase, "blocked"); assert.equal(sends, 0);
  assert.equal(storage.entries.values().next().value, "{invalid");
});

test("gagal membersihkan journal sesudah sukses tetap memblokir dan bisa diverifikasi ulang", async () => {
  const h = harness(), storage = memoryStorage();
  const { recovery } = client(h, storage, async (url, options) => {
    const response = await bridge(h)(url, options);
    storage.fault("remove"); return response;
  });
  assert.equal(await recovery.submit(report, input), false);
  assert.equal(recovery.snapshot().phase, "pending"); assert.equal(storage.entries.size, 1);
  storage.fault("");
  const restored = client(h, storage, bridge(h)).recovery;
  assert.equal(await restored.verify(), true); assert.equal(h.writes.length, 1);
});

test("ordinary history refresh is not a recovery transition", () => {
  const source = readFileSync(resolve(root, "us-05-client.tsx"), "utf8");
  const refresh = source.slice(source.indexOf("function refresh()"), source.indexOf("async function update("));
  assert.ok(refresh.includes("setRevision"));
  assert.doesNotMatch(refresh, /recovery|restore|submit|verify|setCreation|confirm/);
  assert.ok(source.includes("creation.confirmation"));
  assert.ok(source.includes('initialInput={creation.attempt?.payload}'));
});

test("catatan berikutnya hanya memakai key baru saat submit eksplisit sesudah konfirmasi", async () => {
  const h = harness(), storage = memoryStorage(); let generated = 0;
  const { recovery } = client(h, storage, bridge(h), { randomKey: () => ++generated === 1 ? keyA : keyB });
  assert.equal(await recovery.submit(report, input), true);
  assert.equal(generated, 1); assert.equal(h.records.size, 1);
  assert.equal(await recovery.submit(report, { ...input, hasil: "Pemeriksaan berikutnya" }), true);
  assert.equal(generated, 2); assert.equal(h.records.size, 2);
  assert.equal(recovery.snapshot().confirmation, 2);
});

test("respons sukses dengan ID/kasus tidak cocok tetap dianggap ambigu", async () => {
  const h = harness(), storage = memoryStorage();
  const { recovery } = client(h, storage, async () => Response.json({ success: true, data: clone(h.row({ idHasil: "hasil-asing", laporanId: "kasus-lain" })) }, { status: 201 }));
  assert.equal(await recovery.submit(report, input), false);
  assert.equal(recovery.snapshot().phase, "pending"); assert.equal(storage.entries.size, 1);
  assert.equal(recovery.snapshot().confirmation, 0);
});

test("journal akun berbeda tidak diambil alih atau dihapus", async () => {
  const h = harness(), storage = memoryStorage();
  const entry = { version: 1, ownerId: "satgas-lain", report, key: keyA, payload: input };
  storage.entries.set("safe-space:us05:create:v1:satgas-session", JSON.stringify(entry));
  let sends = 0;
  const { recovery } = client(h, storage, async () => { sends++; throw new Error("Must not run"); });
  assert.equal(recovery.snapshot().phase, "blocked");
  assert.equal(await recovery.submit(report, input), false); assert.equal(sends, 0);
  assert.equal(JSON.parse(storage.entries.values().next().value).ownerId, "satgas-lain");
});

test("browser tidak dapat memilih primary key hasil melalui body", async () => {
  const h = harness();
  const response = await h.load(collection).POST(keyed(keyA, { ...input, idHasil: "hasil-palsu" }), context());
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "US05_CREATE_NOT_WRITTEN");
  assert.equal(h.writes.length, 0);
});

test("callback percobaan yang sudah di-unmount tidak menghapus journal percobaan berikutnya", async () => {
  const h = harness(), storage = memoryStorage(), apiFetch = bridge(h);
  let signalStored, release;
  const stored = new Promise((resolve) => { signalStored = resolve; });
  const waiting = new Promise((resolve) => { release = resolve; });
  const first = client(h, storage, async (url, options) => {
    const result = await apiFetch(url, options); signalStored(); await waiting; return result;
  });
  const sending = first.recovery.submit(report, input);
  await stored; first.recovery.dispose();
  const oldStateCount = first.states.length;
  let failNext = false;
  const second = client(h, storage, async (url, options) => {
    if (failNext && options.method === "POST") throw new Error("Synthetic pending B");
    return apiFetch(url, options);
  }, { randomKey: () => keyB });
  assert.equal(await second.recovery.verify(), true);
  failNext = true;
  await second.recovery.submit(report, { ...input, hasil: "Percobaan B" });
  release(); await sending;
  assert.equal(first.states.length, oldStateCount);
  assert.equal(second.recovery.snapshot().phase, "pending");
  assert.equal(second.recovery.snapshot().attempt.key, keyB);
  assert.equal(JSON.parse(storage.entries.values().next().value).key, keyB);
});
