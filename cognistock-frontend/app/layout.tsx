// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CogniStock — Supply Chain Intelligence",
  description: "Enterprise inventory and supply chain management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#F7F8FA] text-[#111827] antialiased">
        {children}
      </body>
    </html>
  );
}