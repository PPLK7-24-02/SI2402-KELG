import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPelaporRoute =
    pathname === "/pelapor" || pathname.startsWith("/pelapor/");
  const isSatgasRoute =
    pathname === "/satgas-ppks" || pathname.startsWith("/satgas-ppks/");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.role) {
    if (isPelaporRoute || isSatgasRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "callbackUrl",
        `${pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  const roleHome =
    token.role === "SATGAS" ? "/satgas-ppks" : "/pelapor";

  if (isAuthPage) {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  if (isPelaporRoute && token.role !== "PELAPOR") {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  if (isSatgasRoute && token.role !== "SATGAS") {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/pelapor/:path*", "/satgas-ppks/:path*"],
};
