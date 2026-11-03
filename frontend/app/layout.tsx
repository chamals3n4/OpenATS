import type { Metadata } from "next";
import { Changa_One, Geist_Mono, Google_Sans } from "next/font/google";
import "./globals.css";

// Self hosted by next/font
const googleSans = Google_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-google-sans",
  display: "swap",
  // Skip the fallback adjustment, next/font can't do it for this font
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
  icons: { icon: "/icon-light.png" },
};

export const dynamic = "force-dynamic";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeInitializer } from "@/components/theme/theme-initializer";
import { runtimeConfigScript } from "@/lib/api-url";

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
      <head>
        {/* The API address for the browser, read now rather than when the app was built */}
        <script dangerouslySetInnerHTML={{ __html: runtimeConfigScript() }} />
      </head>
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
