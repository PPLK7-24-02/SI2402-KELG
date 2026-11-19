"use client";

import type { ReactNode } from "react";
import SatgasFrame from "../../components/SatgasFrame";

export default function PortalFrame({ name, children }: { name: string; children: ReactNode }) {
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <SatgasFrame satgas={{ name, initials }} jejak={[{ label: "Hasil Pemeriksaan" }]} judul="Hasil Pemeriksaan">
    <div className="space-y-6">{children}</div>
  </SatgasFrame>;
}
