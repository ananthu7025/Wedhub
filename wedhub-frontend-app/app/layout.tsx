import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PageViewTracker } from "@/components/shared/PageViewTracker";
import { GoogleAnalytics } from "@/components/shared/GoogleAnalytics";
import { JsonLd } from "@/components/shared/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo/site";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "itsmyKalyanam",
    template: "%s | itsmyKalyanam",
  },
  description: DEFAULT_DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "itsmyKalyanam",
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    title: "itsmyKalyanam | Find Wedding Vendors & Services",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "itsmyKalyanam | Find Wedding Vendors & Services",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <GoogleAnalytics />
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
