"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

type HomeActionsProps = {
  user: {
    name: string;
    role: "PELAPOR" | "SATGAS" | null;
  } | null;
};

export default function HomeActions({ user }: HomeActionsProps) {
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center rounded-xl bg-[#107b73] px-4 text-xs font-bold text-white transition hover:bg-[#0c6b64] sm:px-5 sm:text-sm"
      >
        Login untuk melapor
      </Link>
    );
  }

  const dashboard =
    user.role === "SATGAS" ? "/satgas-ppks" : "/pelapor";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="hidden rounded-xl border border-[#dce7ed] bg-white px-4 py-2 text-sm font-semibold text-[#193652] sm:inline-flex">
        Kamu login sebagai {user.name}
      </span>
      <span className="max-w-32 truncate rounded-lg border border-[#dce7ed] bg-white px-3 py-2 text-xs font-semibold text-[#193652] sm:hidden">
        {user.name}
      </span>
      <Link
        href={dashboard}
        className="hidden h-10 items-center justify-center rounded-xl px-3 text-sm font-bold text-[#107b73] transition hover:bg-[#e7f5f2] sm:inline-flex"
      >
        Halaman Saya
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#dce7ed] bg-white px-3 text-xs font-bold text-[#52677f] transition hover:border-[#c5d8df] hover:bg-[#f8fafb] sm:px-4 sm:text-sm"
      >
        Logout
      </button>
    </div>
  );
}
