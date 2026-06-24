import type { Metadata } from "next";
import { Sniglet } from "next/font/google";
import "./globals.css";

const sniglet = Sniglet({ subsets: ["latin"], weight: ["400", "800"] });

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
        className={`${sniglet.className} min-h-full`}
        style={{ backgroundColor: "#ffec8c" }}
      >
        {children}
      </body>
    </html>
  );
}
