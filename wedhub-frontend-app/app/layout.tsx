import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PageViewTracker } from "@/components/shared/PageViewTracker";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "itsmyKalyanam",
    template: "%s | itsmyKalyanam",
  },
  description: "Discover and connect with trusted wedding vendors near you.",
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
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
