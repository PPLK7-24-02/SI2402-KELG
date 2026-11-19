// Tampilan sementara saat halaman Satgas PPKS sedang dimuat.
// Sidebar tetap tampil (dari layout), hanya bagian header + isi yang diganti skeleton.
export default function SatgasLoading() {
  return (
    <main className="flex min-w-0 flex-1 flex-col" aria-busy="true" aria-label="Memuat halaman">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[#e5edf2] bg-white px-5 py-3 shadow-sm">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-[#e5edf2]" />
          <div className="h-4 w-56 animate-pulse rounded bg-[#e5edf2]" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-[#e5edf2]" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-[#e5edf2]" />
        </div>
      </header>

      <div className="flex-1 space-y-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="space-y-2">
          <div className="h-7 w-72 animate-pulse rounded bg-[#e5edf2]" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[#eef3f7]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    </main>
  );
}
