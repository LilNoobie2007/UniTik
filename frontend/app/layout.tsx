import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Navbar } from "../components/Navbar";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UniTik",
  description: "Campus events and tickets, held in one pass.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `(function(){try{var k="unitik-theme";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.dataset.theme=t;}catch(e){}})();`;

  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
