import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Content Portal",
  description: "Monitor blogs, GMB posts, and review replies across all practices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} antialiased`}
      >
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
