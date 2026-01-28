import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ICETracker MSP - Community Alerts",
  description: "Real-time ICE activity alerts for Minneapolis. Community-driven reporting with Telegram notifications and proximity alerts by zip code.",
  keywords: ["ICE", "immigration", "Minneapolis", "community alerts", "telegram", "know your rights"],
  metadataBase: new URL("https://ice.clydedev.xyz"),
  openGraph: {
    title: "ICETracker MSP",
    description: "Real-time community ICE alerts for Minneapolis. Live map • Telegram alerts • Zip code notifications",
    type: "website",
    siteName: "ICETracker MSP",
    locale: "en_US",
    url: "https://ice.clydedev.xyz",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ICETracker MSP - Real-time community ICE alerts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ICETracker MSP",
    description: "Real-time community ICE alerts for Minneapolis. Live map • Telegram alerts • Zip code notifications",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
