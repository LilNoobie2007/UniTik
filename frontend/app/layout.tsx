import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "UniTik | Smart Campus Events",
  description: "Secure, automated ticketing and event management ecosystem.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen pt-20 antialiased">
        <Navbar />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#121212",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}
