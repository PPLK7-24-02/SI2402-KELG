import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email dan Password",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        // Cek akun pengguna biasa terlebih dahulu.
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
            id: pelapor.idPelapor,
            name: pelapor.nama,
            email: pelapor.email,
            role: "PELAPOR",
            jenisPengguna: pelapor.jenisPengguna,
          };
        }

        // Akun Satgas diperiksa dari tabel terpisah.
        // Akun ini tidak dibuat melalui registrasi publik.
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
          id: satgas.idSatgasPPKS,
          name: satgas.nama,
          email: satgas.email,
          role: "SATGAS",
        };
      },
    }),
  ],

  // Credentials Provider menggunakan JWT untuk sesi login.
  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.jenisPengguna = user.jenisPengguna;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

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