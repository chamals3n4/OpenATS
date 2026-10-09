import type { Metadata } from "next";
import { Changa_One, Geist_Mono, Google_Sans } from "next/font/google";
import { AsgardeoProvider } from "@asgardeo/nextjs/server";
import "./globals.css";

// Variable font (wght 400-700). next/font self-hosts it at build time, so there is
// no request to fonts.googleapis.com at runtime.
const googleSans = Google_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-google-sans",
  display: "swap",
  // next/font has no size metrics for Google Sans, so it cannot build a matching fallback font and
  // warns on every build. Skip that adjustment and name the fallback ourselves instead.
  adjustFontFallback: false,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});
const changaOne = Changa_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-changa-one",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenATS",
  description: "Open Source Applicant Tracking System",
  // Black mark by default; FaviconSwitcher swaps in the white one in dark mode.
  icons: { icon: "/icon-light.png" },
};

export const dynamic = "force-dynamic";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { FaviconSwitcher } from "@/components/theme/favicon-switcher";
import { ThemeInitializer } from "@/components/theme/theme-initializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${changaOne.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeInitializer />
          <FaviconSwitcher />
          <AsgardeoProvider>{children}</AsgardeoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
