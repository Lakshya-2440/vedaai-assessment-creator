import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VedaAI Assessment Creator",
  description: "AI question paper generator for teachers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)]">
        <div className="flex min-h-screen">
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex-1 flex min-h-screen flex-col md:ml-64">
            <Topbar />
            <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-24 sm:pt-6 lg:px-8 md:pb-6">
              {children}
            </main>
            <div className="md:hidden">
              <MobileBottomNav />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
