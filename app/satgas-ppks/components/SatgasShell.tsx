"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import SidebarSatgas, { type SatgasSidebarInfo } from "./SidebarSatgas";

type SatgasShellContextValue = {
  /** Info petugas dari session (dibaca sekali di layout). */
  satgas: SatgasSidebarInfo;
  openSidebar: () => void;
};

const SatgasShellContext = createContext<SatgasShellContextValue | null>(null);

export function useSatgasShell() {
  return useContext(SatgasShellContext);
}

// Kerangka tetap semua halaman Satgas PPKS. Dipasang di app/satgas-ppks/layout.tsx
// sehingga sidebar tidak dibongkar-pasang ulang setiap pindah menu.
export default function SatgasShell({
  satgas,
  children,
}: {
  satgas: SatgasSidebarInfo;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SatgasShellContext.Provider value={{ satgas, openSidebar: () => setSidebarOpen(true) }}>
      <div
        className="flex min-h-screen bg-[#f5f8fb] text-[#193652]"
        style={{ fontFamily: "'Inter', 'Geist', Arial, sans-serif" }}
      >
        <SidebarSatgas
          satgas={satgas}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SatgasShellContext.Provider>
  );
}
