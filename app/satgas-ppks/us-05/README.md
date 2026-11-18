# US-05 — Hasil pemeriksaan dan tindak lanjut

Halaman: `/satgas-ppks/us-05`. Integrasi tautan sidebar bersama ditunda.
Seluruh implementasi dan tes US-05 berada dalam folder ini. Model existing
`HasilPemeriksaan` digunakan kembali; tidak ada tabel baru.

## Kontrak

- `GET /satgas-ppks/us-05/api/kasus?q=&cursor=`: daftar kasus nyata, 25 per halaman.
- `GET /satgas-ppks/us-05/api/kasus/:idLaporan/hasil-pemeriksaan?cursor=`:
  riwayat kasus, 20 per halaman, tanggal pemeriksaan terbaru lebih dahulu.
- `POST` ke URL riwayat: tanggalPemeriksaan, hasil, kesimpulan, keputusan,
  tindakLanjut; opsional realisasiTindakan, tanggalTindakan, detailTindakan.
  UI mengirim header `Idempotency-Key` UUID v4. POST tanpa header tetap memakai
  kontrak lama dan default CUID; body tidak menerima `idHasil` atau `satgasId`.
- `GET` URL riwayat dengan header `Idempotency-Key` melakukan verifikasi khusus
  percobaan tersebut: `{ state: "CONFIRMED", record: ... }` atau
  `{ state: "NOT_CONFIRMED" }`. Tanpa header, GET tetap mengembalikan halaman riwayat.
- `PATCH /satgas-ppks/us-05/api/kasus/:idLaporan/hasil-pemeriksaan/:idHasil`:
  hanya realisasiTindakan, tanggalTindakan, detailTindakan (ketiga properti wajib,
  nilainya boleh null). Pasangan kasus dan hasil diperiksa pada server.

Tanggal dikirim sebagai ISO datetime dengan offset. Form memakai waktu lokal
perangkat dan mengubahnya menjadi ISO. Teks wajib tidak boleh kosong, maksimum
10.000 karakter per field. Keputusan memakai enum existing. Tidak ada draft,
finalisasi terpisah, penghapusan, perubahan status kasus, notifikasi, atau audit
log global. Beberapa hasil pada satu kasus tetap diperbolehkan. Label keputusan
akhir adalah keputusan pada catatan pemeriksaan tersebut, tanpa aturan unik baru.

Respons sukses: `{ success: true, data: ... }`, HTTP 201 untuk POST baru dan 200
untuk replay/GET/PATCH. Respons gagal generik dengan HTTP 400/401/403/404/409/413/415/500.
Mutasi memerlukan JSON dan Origin yang sama dengan origin request URL.
Respons tidak memuat password, kontak pelapor, maupun raw database error.

## Akses dan batasan

NextAuth server session wajib ber-role SATGAS dan akun masih harus ada pada
`SatgasPPKS`. Schema tidak mempunyai flag aktif atau penugasan per kasus;
seluruh akun Satgas yang lolos pemeriksaan tersebut dapat membaca/mencatat
kasus dan memperbarui pelaksanaan tindakan. Pencatat awal berasal dari session,
bukan browser, dan dipertahankan saat tindakan diperbarui.

Proxy global existing tetap berlaku: request tanpa token ke namespace ini bisa
diarahkan ke login sebelum mencapai handler. Handler tetap memeriksa aksesnya
sendiri; client menolak redirect/HTML sebagai respons API. Tidak ada perubahan
proxy untuk mengubah redirect menjadi JSON.

## Identitas request dan pemulihan create

Server menurunkan primary key `idHasil` dari SHA-256 atas domain/version, ID
Satgas dari session, ID kasus, dan key. Digunakan 30 karakter hex lowercase
(120 bit) agar sesuai VARCHAR(30) existing dan tidak bergantung pada case folding
collation. Tidak ada field/model/migration tambahan untuk idempotency ini.
Default CUID pada schema tidak diubah. Semua kode yang membaca hasil tetap
memakai ID string existing; jangan mengasumsikan semua ID hasil berbentuk CUID.

Sebelum INSERT, server memeriksa record dengan ID tersebut. Replay memeriksa
akun, kasus, dan isi inti yang immutable (tanggal pemeriksaan, hasil, kesimpulan,
keputusan, rencana). Konflik isi/identitas mengembalikan 409 tanpa menimpa data.
Request bersamaan ditangani oleh primary key: P2002 baru dianggap replay setelah
record dengan ID yang tepat ditemukan dan cocok. Error unique lain tanpa record
tersebut tetap gagal. Replay tidak mengembalikan realisasi/tanggal/detail ke nilai
awal: perubahan tindakan yang sudah tersimpan tetap dipertahankan.

Key dan payload disimpan sebelum POST dalam sessionStorage khusus akun, satu
percobaan aktif per akun dalam tab. Payload berisi catatan kasus yang sensitif;
jangan menyalin atau mencetaknya ke log. Tidak ada credential yang disimpan.
Entry hanya dibersihkan setelah konfirmasi record yang cocok, atau penolakan
definitif pada pengiriman pertama. Storage tidak tersedia/corrupt atau pembersihan
gagal memblokir pengiriman baru. Data milik akun lain tidak dibaca/dihapus.

- Validasi/auth/origin/body/kasus yang ditolak sebelum `create()` diberi kode
  `US05_CREATE_NOT_WRITTEN`. Hanya pasangan kode dan status 400/401/403/404/413/415
  pada pengiriman pertama membuka form kembali, tanpa reset input.
- Network error, timeout 20 detik, redirect, respons JSON tidak valid, 409,
  dan kegagalan server tetap ambigu. Status HTTP saja bukan bukti rollback.
- Reload memulihkan kasus, input, dan key; tidak pernah mengirim POST otomatis.
  Form baru dan pergantian kasus diblokir selama percobaan belum terkonfirmasi.
- **Verifikasi hasil penyimpanan** melakukan GET khusus key, bukan pencarian
  riwayat umum. `NOT_CONFIRMED` atau riwayat kosong tidak membuka kunci.
- Setelah verifikasi belum menemukan record, **Kirim ulang percobaan yang sama**
  mengirim payload dan key lama secara eksplisit. Bila request lama kemudian
  commit, retry tetap bertemu primary key yang sama dan menjadi replay.
- Penolakan definitif pada retry tidak membuktikan request sebelumnya gagal;
  journal tetap dipertahankan. Tidak ada penggantian key saat pemulihan.
- Konfirmasi yang cocok membersihkan journal, mereset form, dan memuat ulang
  riwayat. Tombol muat ulang riwayat biasa tidak mengubah status pemulihan.

Batas browser: sessionStorage bertahan saat reload pada tab yang sama, tetapi
tidak menjamin pemulihan setelah tab ditutup atau storage dihapus manual. Jangan
menghapusnya ketika hasil belum pasti; minta pemeriksaan operator jika key hilang.
Tab berbeda dapat memulai catatan berbeda dengan key baru; ini bukan deduplikasi
berdasarkan kemiripan isi. Jaminan replay server berlaku bagi key yang dipertahankan.

Realisasi diperbarui dengan PATCH; pembaruan bersamaan memakai perilaku existing
database (penulisan terakhir menang), tanpa sistem versi baru.

## Database

Migration baru hanya menambahkan `realisasiTindakan TEXT NULL` dan
`detailTindakan TEXT NULL`. `tindakLanjut` menyimpan rencana; tanggal pelaksanaan
memakai `tanggalTindakan` existing. Nilai lama tidak diperbarui. Migration lama
dan enum tetap utuh. Migration tidak dijalankan oleh fitur atau pengujian offline.
Sebelum pemakaian nyata, operator perlu memverifikasi baseline dan menerapkan
migration melalui proses terpisah yang diizinkan. Migration existing
`20261112065304_update_database` mengurangi enum status; evaluasinya tetap tugas
koordinasi baseline tim, bukan perubahan US-05.

## Pemeriksaan offline

Jalankan dari root repository menggunakan dependency yang sudah terpasang:

```powershell
node node_modules/prisma/build/index.js validate --config app/satgas-ppks/us-05/prisma-check.config.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js app/satgas-ppks/us-05
node --test app/satgas-ppks/us-05/us-05.test.mjs
```

Config pemeriksaan Prisma sengaja tanpa dotenv/datasource/seed; jangan pakai
untuk operasi migration. Tes memakai Prisma dan session mock, tanpa mengimpor
koneksi aplikasi, server Next.js, atau database. Pengujian MariaDB/NextAuth nyata
dan UI browser membutuhkan tahap tersendiri; tidak dibuktikan oleh tes mock.
