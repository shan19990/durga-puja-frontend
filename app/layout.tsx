import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper"; // ✅ import here

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Durga Puja Pandals - Kolkata",
  description: "Explore and plan your Durga Puja pandal hopping journey across Kolkata",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
