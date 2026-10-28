
import { getServerSession } from "next-auth";
import Link from "next/link";

import HomeActions from "@/app/home-actions";
import { authOptions } from "@/lib/auth";
import Image from "next/image";

const features = [
  {
    number: "01",
    title: "Pelaporan yang terarah",
    description:
      "Sampaikan laporan dengan alur yang jelas agar informasi dapat ditinjau oleh pihak yang berwenang.",
  },
  {
    number: "02",
    title: "Pendampingan dan tindak lanjut",
    description:
      "Pantau proses penanganan laporan dan komunikasi terkait melalui satu platform.",
  },
  {
    number: "03",
    title: "Informasi edukatif",
    description:
      "Akses konten edukasi untuk membantu membangun lingkungan kampus yang aman dan saling menghargai.",
  },
];

const steps = [
  {
    title: "Masuk ke akun",
    description: "Akses layanan menggunakan akun yang terdaftar.",
  },
  {
    title: "Sampaikan informasi",
    description:
      "Isi laporan dengan informasi yang kamu rasa perlu disampaikan.",
  },
  {
    title: "Ikuti prosesnya",
    description: "Pantau tindak lanjut melalui fitur yang tersedia.",
  },
];

const ArrowRight = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

const ShieldCheck = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default async function Home() {
  const session = await getServerSession(authOptions);

  const user = session?.user?.id
    ? {
      name: session.user.name ?? "Pengguna",
      role: session.user.role ?? null,
    }
    : null;

  const dashboardHref =
    user?.role === "SATGAS" ? "/satgas-ppks" : "/pelapor";

  return (
    <main className="min-h-screen bg-[#f5f8fb] text-[#193652]">
      {/* Header */}
      <header className="border-b border-[#e5edf2] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="SAFE SPACE beranda"
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#107b73] text-white">
              <ShieldCheck />
            </span>

            <span>
              <span className="block text-sm font-black tracking-[0.1em]">
                SAFE SPACE
              </span>
              <span className="mt-0.5 block text-[11px] text-[#71839c]">
                Telkom University
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#60748b] md:flex">
            <a href="#tentang" className="transition hover:text-[#107b73]">
              Tentang
            </a>
            <a href="#layanan" className="transition hover:text-[#107b73]">
              Layanan
            </a>
            <a href="#alur" className="transition hover:text-[#107b73]">
              Alur
            </a>
          </nav>

          <HomeActions user={user} />
        </div>
      </header>

      {/* Hero */}
      <section
        id="tentang"
        className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-12 lg:py-24"
      >
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cce7e3] bg-white px-3 py-2 text-[11px] font-bold tracking-wide text-[#107b73]">
            <span className="h-2 w-2 rounded-full bg-[#25a997]" />
            RUANG AMAN UNTUK KOMUNITAS KAMPUS
          </div>

          <h1 className="max-w-2xl text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            Berani bercerita.
            <span className="mt-2 block text-[#107b73]">
              Tidak harus menghadapi sendiri.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#60748b]">
            SAFE SPACE adalah platform pelaporan dan pendampingan untuk
            membantu menciptakan lingkungan Telkom University yang aman,
            peduli, dan saling menghargai.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={user ? dashboardHref : "/login"}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#107b73] px-5 text-sm font-bold text-white transition hover:bg-[#0c6b64]"
            >
              {user ? "Buka dashboard" : "Login untuk melapor"}
              <ArrowRight />
            </Link>

            <a
              href="#alur"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce6ec] bg-white px-5 text-sm font-semibold text-[#52677f] transition hover:border-[#b8ded8] hover:text-[#107b73]"
            >
              Pelajari alurnya
            </a>
          </div>

          <div className="mt-7 flex items-start gap-3 border-t border-[#e1e9ef] pt-5 text-xs leading-5 text-[#71839c]">
            <ShieldCheck className="-mt-0.5 h-5 w-5 shrink-0 text-[#107b73]" />
            <p>
              Akses dan tindak lanjut ditangani sesuai kewenangan akun.
            </p>
          </div>
        </div>

        {/* Visual identitas SAFE SPACE */}
        <div className="mx-auto w-full -mt-12 max-w-sm">
          <Image
            src="/logo_safespace.png"
            alt="SAFE SPACE - Telkom University"
            width={674}
            height={685}
            priority
          />
        </div>
      </section>

      {/* Layanan */}
      <section id="layanan" className="border-y border-[#e5edf2] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#107b73]">
              DUKUNGAN DALAM SATU PLATFORM
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Ruang untuk melapor, mendapat informasi, dan melangkah.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#71839c] sm:text-base">
              Kami merancang alur yang lebih terarah agar pelapor dan petugas
              dapat mengakses dukungan sesuai peran masing-masing.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-[#e1e9ef] p-5 transition-colors hover:border-[#b8ded8] sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f5f2] text-sm font-extrabold text-[#107b73]">
                    {feature.number}
                  </span>
                  <span className="text-xs font-medium text-[#a0afbd]">
                    LAYANAN
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>

                <p className="mt-2 text-sm leading-6 text-[#71839c]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Alur */}
      <section id="alur" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#107b73]">
              LANGKAH YANG JELAS
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Mulai dengan cara yang terasa aman bagimu.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#71839c] sm:text-base">
              Gunakan akunmu untuk mengakses layanan yang sesuai. Informasi
              laporan ditangani oleh pihak berwenang.
            </p>

            <Link
              href={user ? dashboardHref : "/login"}
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#107b73] transition hover:text-[#0c6b64]"
            >
              {user ? "Buka dashboard" : "Mulai sekarang"}
              <ArrowRight />
            </Link>
          </div>

          <ol className="divide-y divide-[#e1e9ef] border-y border-[#e1e9ef]">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 py-5 sm:gap-5 sm:py-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#193652] text-sm font-bold text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#71839c]">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e1e9ef] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-[#71839c] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link
            href="/"
            className="font-extrabold tracking-[0.1em] text-[#193652]"
          >
            SAFE SPACE · TELKOM UNIVERSITY
          </Link>
          <span>Ruang aman tumbuh dari kepedulian bersama.</span>
        </div>
      </footer>
    </main>
  );
}
