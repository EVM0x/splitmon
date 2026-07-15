import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SplitMon — Onchain Bill Splitter",
  description: "Split expenses with friends on Monad. Create a split, friends pay their share, funds auto-release when fully paid.",
  openGraph: {
    title: "SplitMon — Onchain Bill Splitter",
    description: "Split expenses with friends on Monad.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
