import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kyouiku - 英語テスト不正検出システム",
  description: "LLMを活用したオンライン英語テストの不正検出システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
