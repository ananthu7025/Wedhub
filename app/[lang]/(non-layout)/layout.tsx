import { Roboto } from "next/font/google";
import { ToastContainer } from "react-toastify";
import ScriptComponent from "@/components/Script";
import { getLanguage } from "@/utils/helpers-server";

const roboto = Roboto({
  weight: ["100", "400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export default function NonLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = getLanguage();

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className={roboto.className}>
        {children}
        <ToastContainer position="bottom-right" />
        <ScriptComponent />
      </body>
    </html>
  );
}
