import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket Semester | Student budget coach",
  description: "A student budget coach that shows whether your money will last through finals.",
  metadataBase: new URL("https://pocket-semester.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: { title: "Pocket Semester", description: "A student budget coach that shows whether your money will last through finals.", type: "website", url: "/" },
  twitter: { card: "summary", title: "Pocket Semester", description: "A student budget coach that shows whether your money will last through finals." },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
