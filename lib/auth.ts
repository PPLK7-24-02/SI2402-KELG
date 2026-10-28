
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email dan Password",

      credentials: {
        identifier: {
          label: "Email atau nama pengguna",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const email = credentials?.identifier?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        // 1. Periksa akun pelapor
        const pelapor = await prisma.pelapor.findUnique({
          where: { email },
        });

        if (pelapor) {
          const passwordCocok = await bcrypt.compare(
            password,
            pelapor.passwordHash
          );

          if (!passwordCocok) {
            return null;
          }

          return {
            id: String(pelapor.idPelapor),
            name: pelapor.nama,
            email: pelapor.email,
            role: "PELAPOR",
            jenisPengguna: pelapor.jenisPengguna,
          };
        }

        // 2. Jika bukan pelapor, periksa akun Satgas
        const satgas = await prisma.satgasPPKS.findUnique({
          where: { email },
        });

        if (!satgas) {
          return null;
        }

        const passwordCocok = await bcrypt.compare(
          password,
          satgas.passwordHash
        );

        if (!passwordCocok) {
          return null;
        }

        return {
          id: String(satgas.idSatgasPPKS),
          name: satgas.nama,
          email: satgas.email,
          role: "SATGAS",
        };
      },
    }),
  ],

  // Credentials Provider menggunakan JWT untuk sesi login
  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    // Simpan data pengguna ke dalam JWT setelah login berhasil
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        if (user.jenisPengguna) {
          token.jenisPengguna = user.jenisPengguna;
        } else {
          delete token.jenisPengguna;
        }
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
};
