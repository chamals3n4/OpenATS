import type { Metadata } from "next";
import { Changa_One, Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { AsgardeoProvider } from "@asgardeo/nextjs/server";
import "./globals.css";
import "@/lib/asgardeo-fetch-retry";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });
const changaOne = Changa_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-changa-one",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenATS",
  description: "Open Source Applicant Tracking System",
};

export const dynamic = "force-dynamic";

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeInitializer } from "@/components/theme-initializer";
import { QueryProvider } from "@/components/query-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const asgardeoConfig = {
    baseUrl: process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL,
    organizationHandle: process.env.NEXT_PUBLIC_ASGARDEO_ORGANIZATION_HANDLE,
    clientId: process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID,
    applicationId:
      process.env.NEXT_PUBLIC_ASGARDEO_APPLICATION_ID ??
      process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID,
    clientSecret: process.env.ASGARDEO_CLIENT_SECRET,
    afterSignInUrl: process.env.NEXT_PUBLIC_ASGARDEO_AFTER_SIGN_IN_URL,
    afterSignOutUrl: process.env.NEXT_PUBLIC_ASGARDEO_AFTER_SIGN_OUT_URL,
    scopes: process.env.NEXT_PUBLIC_ASGARDEO_SCOPES,
    inheritFromBranding: false,
  };

  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${changaOne.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeInitializer />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <AsgardeoProvider {...asgardeoConfig}>
            <QueryProvider>{children as any}</QueryProvider>
          </AsgardeoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
