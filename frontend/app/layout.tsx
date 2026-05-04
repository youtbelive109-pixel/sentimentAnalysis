import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZENITH - Live Sentiment Dashboard",
  description: "Real-time YouTube live stream sentiment analysis dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-zenith text-zenith-dark font-inter">
        {children}
      </body>
    </html>
  );
}
