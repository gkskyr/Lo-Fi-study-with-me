import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "koZan",
  description: "Birlikte çalış, birlikte öğren.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className="h-full">
      <body
        className={`${geist.className} min-h-full`}
        style={{ backgroundColor: "#ffec8c" }}
      >
        {children}
      </body>
    </html>
  );
}
