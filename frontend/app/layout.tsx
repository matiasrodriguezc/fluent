import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Fluent AI OS",
  description: "Executive Data Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-[#F9FAFB] text-gray-900`}>
        <div className="flex min-h-screen">
          {/* Sidebar Fija */}
          <AppSidebar />
          
          {/* Contenido Dinámico (Las páginas) */}
          <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}