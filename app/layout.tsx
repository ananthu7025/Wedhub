import React from "react";
import { Metadata } from "next";
import Content from "@/config/content";
import "./globals.scss";
import "react-phone-input-2/lib/style.css";

export const metadata: Metadata = {
  title: Content.basic.court_short_name,
  description: Content.basic.project_description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
