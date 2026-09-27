import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOTION-BOT — Foundation",
  description: "MOTION-BOT AI Motion Design Studio Technical Foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
