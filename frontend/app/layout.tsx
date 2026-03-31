import "./globals.css";
import Navbar from "./components/Navbar";
import { Inter } from "next/font/google";

export const metadata = {
  title: "DocSMart",
  description: "AI-powered document understanding",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen font-sans"
        suppressHydrationWarning
      >
        <Navbar />
        <main className="px-8 py-12">{children}</main>
      </body>
    </html>
  );
}