
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Login SAFE SPACE",

      credentials: {
        identifier: {
          label: "Email atau nama pengguna",
          type: "text",
        },
        password: {
          label: "Kata sandi",
          type: "password",
        },
      },

      async authorize(credentials) {
        const identifier = credentials?.identifier;
        const password = credentials?.password;

        if (
          typeof identifier !== "string" ||
          typeof password !== "string" ||
          !identifier.trim() ||
          !password
        ) {
          return null;
        }

        const normalizedIdentifier = identifier.trim().toLowerCase();

        try {
          // 1. Cek akun di tabel SATGAS PPKS
          const satgas = await prisma.satgasPPKS.findFirst({
            where: {
              OR: [
                { email: normalizedIdentifier },
                { nama: identifier },
              ],
            },
          });

          if (satgas) {
            const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(
              satgas.passwordHash
            );
            const passwordValid = isBcryptHash
              ? await bcrypt.compare(password, satgas.passwordHash)
              : password === satgas.passwordHash;

            if (!passwordValid) {
              return null;
            }

            if (!isBcryptHash) {
              const passwordHash = await bcrypt.hash(password, 12);
              await prisma.satgasPPKS.update({
                where: { idSatgasPPKS: satgas.idSatgasPPKS },
                data: { passwordHash },
              });
            }

            return {
              id: String(satgas.idSatgasPPKS),
              name: satgas.nama,
              email: satgas.email,
              role: "SATGAS",
            };
          }

          // 2. Jika bukan Satgas, cek akun di tabel PELAPOR
          const pelapor = await prisma.pelapor.findUnique({
            where: {
              email: normalizedIdentifier,
            },
          });

          if (!pelapor) {
            return null;
          }

          const passwordValid = await bcrypt.compare(
            password,
            pelapor.passwordHash
          );

          if (!passwordValid) {
            return null;
          }

          return {
            id: String(pelapor.idPelapor),
            name: pelapor.nama,
            email: pelapor.email,
            role: "PELAPOR",
            jenisPengguna: pelapor.jenisPengguna,
          };
        } catch (error) {
          console.error("[AUTH] Kesalahan autentikasi:", error);
          throw error;
        }
      }
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        if (user.jenisPengguna) {
          token.jenisPengguna = user.jenisPengguna;
        } else {
          delete token.jenisPengguna;
        }
      } else if (!token.sub && typeof token.id === "string") {
        token.sub = token.id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.role) {
          session.user.role = token.role;
        }
        if (token.jenisPengguna) {
          session.user.jenisPengguna = token.jenisPengguna;
        }
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
