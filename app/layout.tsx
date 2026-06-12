import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "MockExam Pro — Timed Subject Practice",
  description:
    "Timed mock tests with the toughest questions across Math, Physics, English, and more.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        <div className="hero-gradient min-h-screen">
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
