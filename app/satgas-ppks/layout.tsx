import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import SatgasShell from "./components/SatgasShell";

// Layout bersama Satgas PPKS: sidebar dipasang sekali di sini dan tetap di tempat
// saat berpindah halaman. Pengecekan akses tetap dilakukan di masing-masing page.
export default async function SatgasLayout({ children }: LayoutProps<"/satgas-ppks">) {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? "Satgas PPKS";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return <SatgasShell satgas={{ name, initials }}>{children}</SatgasShell>;
}
