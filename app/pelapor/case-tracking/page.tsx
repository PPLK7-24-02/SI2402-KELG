import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import CaseTrackingClient from "./case-tracking-client";
import SidebarPelapor from "../components/SidebarPelapor";

export const metadata = {
  title: "Lacak Status Laporan | SAFE SPACE",
  description:
    "Pantau status dan perkembangan laporan yang Anda kirim melalui SAFE SPACE.",
};

export interface LaporanPelaporTracking {
  idLaporan: string;
  nomorKasus: string;
  kategori: string;
  tanggalLaporan: string;
  waktuLaporanFormatted: string;
  status:
    | "DITERIMA"
    | "DIVERIFIKASI"
    | "DITANGANI"
    | "SELESAI"
    | "TIDAK_VALID"
    | string;
  tingkatUrgensi: string;
  jenisLaporan: string;
  lokasiGedung: string;
  lokasiArea: string;
  kronologi: string;
  updatedAt: string;
  riwayat: Array<{
    idRiwayat: string;
    jenisAktivitas: string;
    statusBaru: string | null;
    createdAt: string;
  }>;
}

const SAMPLE_MOCKUP_REPORTS: LaporanPelaporTracking[] = [
  {
    idLaporan: "rep-001",
    nomorKasus: "SS-2025-024",
    kategori: "Perundungan",
    tanggalLaporan: "2025-02-24T09:32:00.000Z",
    waktuLaporanFormatted: "24 Februari 2025",
    status: "DITANGANI",
    tingkatUrgensi: "TINGGI",
    jenisLaporan: "REGULER",
    lokasiGedung: "Gedung Tokong Nanas",
    lokasiArea: "Lantai 2",
    kronologi:
      "Perundungan secara terus-menerus dan intimidasi di area kampus.",
    updatedAt: "2025-02-24T15:40:00.000Z",
    riwayat: [
      {
        idRiwayat: "rw-1",
        jenisAktivitas: "Laporan Diajukan",
        statusBaru: "DITERIMA",
        createdAt: "2025-02-24T09:32:00.000Z",
      },
      {
        idRiwayat: "rw-2",
        jenisAktivitas: "Laporan Diverifikasi",
        statusBaru: "DIVERIFIKASI",
        createdAt: "2025-02-24T11:15:00.000Z",
      },
      {
        idRiwayat: "rw-3",
        jenisAktivitas: "Penanganan Berlangsung",
        statusBaru: "DITANGANI",
        createdAt: "2025-02-24T15:40:00.000Z",
      },
    ],
  },
  {
    idLaporan: "rep-002",
    nomorKasus: "SS-2025-017",
    kategori: "Kekerasan Verbal",
    tanggalLaporan: "2025-02-14T10:15:00.000Z",
    waktuLaporanFormatted: "14 Februari 2025",
    status: "DIVERIFIKASI",
    tingkatUrgensi: "SEDANG",
    jenisLaporan: "REGULER",
    lokasiGedung: "Gedung Grha Korporat",
    lokasiArea: "Lantai 1",
    kronologi:
      "Pelecehan verbal dan ucapan tidak pantas di selasar gedung.",
    updatedAt: "2025-02-14T14:20:00.000Z",
    riwayat: [
      {
        idRiwayat: "rw-4",
        jenisAktivitas: "Laporan Diajukan",
        statusBaru: "DITERIMA",
        createdAt: "2025-02-14T10:15:00.000Z",
      },
      {
        idRiwayat: "rw-5",
        jenisAktivitas: "Laporan Diverifikasi",
        statusBaru: "DIVERIFIKASI",
        createdAt: "2025-02-14T14:20:00.000Z",
      },
    ],
  },
  {
    idLaporan: "rep-003",
    nomorKasus: "SS-2025-003",
    kategori: "Diskriminasi",
    tanggalLaporan: "2025-01-28T08:45:00.000Z",
    waktuLaporanFormatted: "28 Januari 2025",
    status: "SELESAI",
    tingkatUrgensi: "RENDAH",
    jenisLaporan: "REGULER",
    lokasiGedung: "Gedung Damar",
    lokasiArea: "Lantai 3",
    kronologi:
      "Tindakan perlakuan diskriminatif dalam kegiatan organisasi.",
    updatedAt: "2025-02-05T16:00:00.000Z",
    riwayat: [
      {
        idRiwayat: "rw-6",
        jenisAktivitas: "Laporan Diajukan",
        statusBaru: "DITERIMA",
        createdAt: "2025-01-28T08:45:00.000Z",
      },
      {
        idRiwayat: "rw-7",
        jenisAktivitas: "Laporan Diverifikasi",
        statusBaru: "DIVERIFIKASI",
        createdAt: "2025-01-28T13:10:00.000Z",
      },
      {
        idRiwayat: "rw-8",
        jenisAktivitas: "Penanganan Berlangsung",
        statusBaru: "DITANGANI",
        createdAt: "2025-01-29T09:00:00.000Z",
      },
      {
        idRiwayat: "rw-9",
        jenisAktivitas: "Pemeriksaan dan Tindak Lanjut",
        statusBaru: "DITANGANI",
        createdAt: "2025-02-02T11:30:00.000Z",
      },
      {
        idRiwayat: "rw-10",
        jenisAktivitas: "Penanganan Kasus Selesai",
        statusBaru: "SELESAI",
        createdAt: "2025-02-05T16:00:00.000Z",
      },
    ],
  },
];

function formatIndonesianDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function CaseTrackingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PELAPOR") {
    redirect("/login?callbackUrl=/pelapor/case-tracking");
  }

  const userId = session.user.id;
  let userReports: LaporanPelaporTracking[] = [];

  try {
    const dbReports = await prisma.laporan.findMany({
      where: {
        pelaporId: userId,
      },
      select: {
        idLaporan: true,
        nomorKasus: true,
        jenis: true,
        tingkatUrgensi: true,
        status: true,
        kronologi: true,
        createdAt: true,
        updatedAt: true,
        kategori: {
          select: {
            nama: true,
          },
        },
        lokasi: {
          select: {
            namaGedung: true,
            area: true,
          },
        },
        riwayatPenanganan: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            idRiwayat: true,
            jenisAktivitas: true,
            statusBaru: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (dbReports && dbReports.length > 0) {
      userReports = dbReports.map((item) => ({
        idLaporan: item.idLaporan,
        nomorKasus: item.nomorKasus,
        kategori: item.kategori.nama,
        tanggalLaporan: item.createdAt.toISOString(),
        waktuLaporanFormatted: formatIndonesianDate(
          new Date(item.createdAt)
        ),
        status: item.status,
        tingkatUrgensi: item.tingkatUrgensi,
        jenisLaporan: item.jenis,
        lokasiGedung: item.lokasi.namaGedung,
        lokasiArea: item.lokasi.area || "",
        kronologi: item.kronologi,
        updatedAt: item.updatedAt.toISOString(),
        riwayat: item.riwayatPenanganan.map((r) => ({
          idRiwayat: r.idRiwayat,
          jenisAktivitas: r.jenisAktivitas,
          statusBaru: r.statusBaru,
          createdAt: r.createdAt.toISOString(),
        })),
      }));
    } else {
      userReports = SAMPLE_MOCKUP_REPORTS;
    }
  } catch (err) {
    console.warn(
      "[CASE_TRACKING] Error fetching reports from DB, fallback to mockup data:",
      err
    );
    userReports = SAMPLE_MOCKUP_REPORTS;
  }

  const currentUser = {
    name: session.user.name || "Nadia Putri",
    email: session.user.email || "pelapor@telkomuniversity.ac.id",
    jenisPengguna:
      (session.user as { jenisPengguna?: string }).jenisPengguna ||
      "Mahasiswa",
    initials: (session.user.name || "Nadia Putri")
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase(),
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#f3f6fa] text-[#193652]">
      <SidebarPelapor
        emergencyReport={{ path: "/emergency-report" }}
      />

      <main className="min-w-0 flex-1">
        <CaseTrackingClient
          reports={userReports}
          user={currentUser}
        />
      </main>
    </div>
  );
}