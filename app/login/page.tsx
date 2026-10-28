
"use client";

import { getSession, signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        identifier: identifier.trim(),
        password,
      });

      if (!result || result.error) {
        setError("Email atau kata sandi tidak valid.");
        return;
      }

      const session = await getSession();
      const callbackUrl = new URLSearchParams(
        window.location.search
      ).get("callbackUrl");
      const requestedUrl = callbackUrl
        ? new URL(callbackUrl, window.location.origin)
        : null;

      if (requestedUrl?.origin === window.location.origin) {
        router.push(
          `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`
        );
      } else if (session?.user.role === "SATGAS") {
        router.push("/satgas/dashboard");
      } else if (session?.user.role === "PELAPOR") {
        router.push("/dashboard");
      } else {
        setError("Sesi login tidak dapat diverifikasi. Silakan coba lagi.");
      }
    } catch {
      setError(
        "Tidak dapat terhubung ke server. Silakan coba kembali."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] lg:grid lg:grid-cols-[45%_55%]">
    {/* PANEL KIRI */}
    <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[#193652] px-10 py-12 text-white lg:flex xl:px-16">
      {/* Dekorasi lingkaran */}
      <div className="pointer-events-none absolute -right-48 -top-52 h-[580px] w-[580px] rounded-full border border-white/[0.06]" />
      <div className="pointer-events-none absolute -right-36 -top-40 h-[450px] w-[450px] rounded-full border border-white/[0.045]" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-[330px] w-[330px] rounded-full border border-white/[0.05]" />

      {/* Logo */}
      <div className="relative z-10">
        <h1 className="text-lg font-extrabold tracking-[0.12em]">
          SAFE SPACE
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Telkom University
        </p>
      </div>

      {/* Konten utama */}
      <div className="relative z-10 my-auto max-w-2xl py-16">
        <p className="mb-4 text-[10px] font-bold tracking-[0.2em] text-[#83e0d4]">
          AKSES YANG AMAN DAN TERARAH
        </p>

        <h2 className="max-w-xl text-4xl font-bold leading-[1.2] tracking-tight xl:text-5xl">
          Satu platform, akses sesuai kewenangan.
        </h2>

        <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">
          SAFE SPACE membantu pelapor mengakses laporan pribadi
          dan petugas Satgas PPKS menjalankan fungsi penanganan
          yang berwenang.
        </p>

        {/* Kartu role */}
        <div className="mt-10 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#12616a]/50 text-[#8ce7dc]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </div>

            <div>
              <h3 className="text-xs font-bold">Pelapor</h3>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">
                Mahasiswa, dosen, dan staf mengakses Dashboard
                Pelapor serta fitur laporan pribadinya.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#12616a]/50 text-[#8ce7dc]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <div>
              <h3 className="text-xs font-bold">
                Petugas Satgas PPKS
              </h3>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">
                Akun petugas berwenang mengakses Dashboard
                Monitoring PPKS dan fungsi administratif.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer kiri */}
      <div className="relative z-10 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Akses ditentukan oleh akun yang telah diberi kewenangan.
        </div>
      </div>
    </section>

    {/* PANEL KANAN */}
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
      <div className="w-full max-w-[520px]">
        {/* Form card */}
        <div className="rounded-2xl border border-[#dce4ed] border-t-[3px] border-t-[#dce4ed] bg-white p-6 shadow-[0_16px_45px_rgba(25,54,82,0.08)] sm:p-8 md:p-9">
          <div className="mb-7">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#107b73]">
              SELAMAT DATANG
            </p>

            <h2 className="text-2xl font-bold tracking-tight text-[#193652] sm:text-[28px]">
              Masuk ke SAFE SPACE
            </h2>

            <p className="mt-2 text-xs leading-5 text-[#71839c]">
              Masuk menggunakan akun yang telah diberi akses
              untuk menggunakan sistem.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email / username */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-[11px] font-bold text-[#193652]"
              >
                Email atau nama pengguna
              </label>

              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="Masukkan email atau nama pengguna"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                className="h-[53px] w-full rounded-xl border border-[#d8e1eb] bg-white px-4 text-xs text-[#193652] outline-none transition placeholder:text-[#96a1ab] focus:border-[#128078] focus:ring-4 focus:ring-[#128078]/10"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[11px] font-bold text-[#193652]"
              >
                Kata sandi
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-[53px] w-full rounded-xl border border-[#d8e1eb] bg-white px-4 pr-24 text-xs text-[#193652] outline-none transition placeholder:text-[#96a1ab] focus:border-[#128078] focus:ring-4 focus:ring-[#128078]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 text-[10px] font-bold text-[#107b73] transition hover:text-[#0a5d57] focus:outline-none focus:underline"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            {/* Pesan error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
              >
                {error}
              </div>
            )}

            {/* Tombol masuk */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-[53px] w-full items-center justify-center gap-3 rounded-xl bg-[#107b73] text-sm font-bold text-white transition hover:bg-[#0c6b64] focus:outline-none focus:ring-4 focus:ring-[#107b73]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Masuk"}

              {!loading && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </form>

          {/* Informasi keamanan */}
          <div className="mt-4 border-t border-[#dce4ed] pt-4">
            <div className="flex items-start gap-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10877e"
                strokeWidth="1.7"
                className="mt-0.5 h-[18px] w-[18px] shrink-0"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>

              <div>
                <h3 className="text-[10px] font-bold text-[#193652]">
                  Privasi dan keamanan akses
                </h3>
                <p className="mt-2 text-[9px] leading-[1.6] text-[#7b8ca5]">
                  Jangan membagikan kredensial akun. Hak akses
                  mengikuti kewenangan akun dan tidak dapat
                  dipilih sendiri melalui formulir ini.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer kanan */}
        <p className="mt-5 text-[9px] text-[#9aabc0]">
          Privasi pengguna adalah prioritas
        </p>
      </div>
    </section>
    </main>
  );
}
