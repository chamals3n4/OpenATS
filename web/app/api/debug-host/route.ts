import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const h = await headers();
  return NextResponse.json({
    host: h.get("host"),
    xForwardedHost: h.get("x-forwarded-host"),
    xForwardedProto: h.get("x-forwarded-proto"),
    allEnvs: {
      SIGN_IN_URL: process.env.NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL,
      BASE_URL: process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL,
    },
  });
}
