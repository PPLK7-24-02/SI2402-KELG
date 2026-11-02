"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type JenisPengguna = "MAHASISWA" | "STAFF" | "DOSEN";

type FormRegistrasi = {
  nama: string;
  email: string;
  jenisPengguna: JenisPengguna;
  nimNip: string;
  noHp: string;
  password: string;
  konfirmasiPassword: string;
};

const formAwal: FormRegistrasi = {
  nama: "",
  email: "",
  jenisPengguna: "MAHASISWA",
  nimNip: "",
  noHp: "",
  password: "",
  konfirmasiPassword: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormRegistrasi>(formAwal);
  const [pesan, setPesan] = useState("");
  const [berhasil, setBerhasil] = useState(false);
  const [loading, setLoading] = useState(false);

  function ubahKolom(kolom: keyof FormRegistrasi, nilai: string) {
    setForm((sebelumnya) => ({
      ...sebelumnya,
      [kolom]: nilai,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPesan("");
    setBerhasil(false);

    if (form.password !== form.konfirmasiPassword) {
      setPesan("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: form.nama,
          email: form.email,
          jenisPengguna: form.jenisPengguna,
          nimNip: form.nimNip,
          noHp: form.noHp,
          password: form.password,
        }),
      });

      const hasil = await response.json();

      if (!response.ok) {
        setPesan(hasil.message || "Registrasi gagal.");
        return;
      }

      setBerhasil(true);
      setPesan("Registrasi berhasil! Kamu akan diarahkan ke halaman login...");
      setForm(formAwal);

      window.setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setPesan("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const kelasInput =
    "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          ← Kembali ke halaman utama
        </Link>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="mb-7">
            <p className="text-sm font-semibold tracking-widest text-blue-700">
              SAFE SPACE
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Buat Akun Baru
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Daftarkan akun untuk menggunakan layanan pelaporan SAFE SPACE.
            </p>
          </div>

          {pesan && (
            <div
              role={berhasil ? "status" : "alert"}
              aria-live="polite"
              className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                berhasil
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {pesan}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="nama" className="text-sm font-medium">
                Nama lengkap
              </label>
              <input
                id="nama"
                name="nama"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={150}
                value={form.nama}
                onChange={(e) => ubahKolom("nama", e.target.value)}
                className={kelasInput}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={150}
                value={form.email}
                onChange={(e) => ubahKolom("email", e.target.value)}
                className={kelasInput}
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label htmlFor="jenisPengguna" className="text-sm font-medium">
                Jenis pengguna
              </label>
              <select
                id="jenisPengguna"
                name="jenisPengguna"
                required
                value={form.jenisPengguna}
                onChange={(e) => ubahKolom("jenisPengguna", e.target.value)}
                className={kelasInput}
              >
                <option value="MAHASISWA">Mahasiswa</option>
                <option value="STAFF">Staff</option>
                <option value="DOSEN">Dosen</option>
              </select>
            </div>

            <div>
              <label htmlFor="nimNip" className="text-sm font-medium">
                NIM / NIP
              </label>
              <input
                id="nimNip"
                name="nimNip"
                type="text"
                required
                maxLength={50}
                value={form.nimNip}
                onChange={(e) => ubahKolom("nimNip", e.target.value)}
                className={kelasInput}
                placeholder="Masukkan NIM atau NIP"
              />
            </div>

            <div>
              <label htmlFor="noHp" className="text-sm font-medium">
                Nomor HP
              </label>
              <input
                id="noHp"
                name="noHp"
                type="tel"
                autoComplete="tel"
                required
                maxLength={20}
                value={form.noHp}
                onChange={(e) => ubahKolom("noHp", e.target.value)}
                className={kelasInput}
                placeholder="Contoh: 081234567890"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={form.password}
                onChange={(e) => ubahKolom("password", e.target.value)}
                className={kelasInput}
                placeholder="Minimal 8 karakter"
              />
            </div>

            <div>
              <label
                htmlFor="konfirmasiPassword"
                className="text-sm font-medium"
              >
                Konfirmasi password
              </label>
              <input
                id="konfirmasiPassword"
                name="konfirmasiPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={form.konfirmasiPassword}
                onChange={(e) =>
                  ubahKolom("konfirmasiPassword", e.target.value)
                }
                className={kelasInput}
                placeholder="Masukkan ulang password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Mendaftarkan akun..." : "Daftar"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Data akun digunakan untuk kebutuhan layanan SAFE SPACE.
          </p>
        </section>
      </div>
    </main>
  );
}
