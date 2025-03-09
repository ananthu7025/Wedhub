import React from "react";
import { Roboto } from "next/font/google";
import ScriptComponent from "@/components/Script";
import { ToastContainer } from "react-toastify";
import { getLanguage } from "@/utils/helpers-server";

const roboto = Roboto({
  weight: ["100", "400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export default function PathLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = getLanguage();

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <head>
        <ScriptComponent />
      </head>
      <body className={roboto.className}>
        <main>{children}</main>
        <ToastContainer position="bottom-right" />
      </body>
    </html>
  );
}
