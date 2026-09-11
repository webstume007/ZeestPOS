import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BajwaStore",
  description: "Modern POS and Khata Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-200 overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <div className="hidden md:flex h-full">
              <Sidebar />
            </div>
            <main className="flex-1 overflow-auto relative [&:has(~.mobile-nav-visible)]:pt-[72px] md:[&:has(~.mobile-nav-visible)]:pt-0">
              {children}
            </main>
            <MobileNav />
            <Toaster position="top-center" toastOptions={{
              className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-lg',
              duration: 3000,
            }} />
          </AuthProvider>        </ThemeProvider>
      </body>
    </html>
  );
}
