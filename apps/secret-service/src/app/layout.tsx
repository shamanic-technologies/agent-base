import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Secret Service",
  description: "Secure credential management service for Agent Base",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased flex items-center justify-center">
        {children}
        <Toaster />
      </body>
    </html>
  );
} 