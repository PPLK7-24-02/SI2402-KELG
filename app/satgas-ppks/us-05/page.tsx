import { redirect } from "next/navigation";
import { currentSatgas, FeatureError } from "./server";
import Us05Client from "./us-05-client";

export const runtime = "nodejs";
export const metadata = { title: "Hasil Pemeriksaan | SAFE SPACE Satgas PPKS" };

export default async function Us05Page() {
  let account;
  try {
    account = await currentSatgas();
  } catch (error) {
    if (error instanceof FeatureError) {
      redirect("/login?callbackUrl=%2Fsatgas-ppks%2Fus-05");
    }
    return <main className="min-h-screen bg-[#f5f8fb] p-8 text-[#193652]">
      <h1 className="text-2xl font-bold">Hasil Pemeriksaan</h1>
      <p role="alert" className="mt-4">Akses belum dapat diverifikasi. Silakan muat ulang halaman.</p>
    </main>;
  }
  return <Us05Client key={account.idSatgasPPKS} ownerId={account.idSatgasPPKS} satgasName={account.nama} />;
}
