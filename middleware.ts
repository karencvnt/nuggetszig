import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const authRoutes = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];
const protectedPrefix = "/app";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));
  const isProtected = pathname.startsWith(protectedPrefix);

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/app", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
