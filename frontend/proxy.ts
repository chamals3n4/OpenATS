import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/careers",
]);

const PUBLIC_PREFIXES = [
  "/careers/",
  "/assessment/",
  "/interview/",
  "/offer/",
  "/api/public/",
  "/api/auth/",
];

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

// An optimistic check only: getSessionCookie says a cookie exists, not that
// the session behind it is valid. The dashboard layout does the real check.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (pathname === "/login" && hasSessionCookie) {
    // Verified for real here. A stale cookie would otherwise bounce between
    // this redirect and the dashboard layout's redirect back to /login.
    const session = await auth.api.getSession({ headers: request.headers });
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (!hasSessionCookie && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
