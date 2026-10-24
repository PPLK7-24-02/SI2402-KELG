import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "PELAPOR" | "SATGAS";
    jenisPengguna?: "MAHASISWA" | "STAFF" | "DOSEN";
  }

  interface Session {
    user: {
      id: string;
      role?: "PELAPOR" | "SATGAS";
      jenisPengguna?: "MAHASISWA" | "STAFF" | "DOSEN";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "PELAPOR" | "SATGAS";
    jenisPengguna?: "MAHASISWA" | "STAFF" | "DOSEN";
  }
}