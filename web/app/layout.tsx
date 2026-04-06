import type { Metadata } from "next";
import { Changa_One, Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { AsgardeoProvider } from "@asgardeo/nextjs/server";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <AsgardeoProvider>{children as any}</AsgardeoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
