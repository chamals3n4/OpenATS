import {
  asgardeoMiddleware,
  createRouteMatcher,
} from "@asgardeo/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/login",
  "/careers",
  "/careers/*",
  "/assessment/*",
  "/api/public/*",
]);

export const proxy = asgardeoMiddleware(
  async (asgardeo, request) => {
    if (request.nextUrl.pathname === "/login" && asgardeo.isSignedIn()) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isPublicRoute(request)) {
      const protectionResult = await asgardeo.protectRoute();

      if (protectionResult) {
        return protectionResult;
      }
    }
  },
  { signInUrl: "/login" },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
