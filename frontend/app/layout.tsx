import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Toaster } from "sonner"; // <-- 1. Import Sonner

export const metadata: Metadata = {
  title: "UniTik | Smart Campus Events",
  description: "Secure, automated ticketing and event management ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen pt-20">
        <Navbar />
        {children}
        
        {/* 2. Add the global Toaster component */}
        <Toaster 
          theme="dark" 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: '#121212',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            }
          }}
        />
      </body>
    </html>
  );
}