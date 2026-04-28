import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


export const metadata: Metadata = {
  title: "Stack Sentinel | Your Tech Stack Watchdog",
  description: "AI-powered technical intelligence feed. Stop wasting hours reading news, get only what affects your stack.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark font-sans", inter.variable)}>
      <body
        className={`antialiased min-h-screen bg-background text-foreground flex flex-col`}
      >
        <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="font-bold text-xl flex items-center space-x-2 text-primary tracking-tight">
              <span>Stack<span className="text-blue-500">Sentinel</span></span>
            </div>
            <nav className="flex space-x-6 text-sm font-medium">
              <a href="/alerts" className="text-muted-foreground hover:text-foreground transition-colors">Alerts</a>
              <a href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <footer className="py-6 border-t border-border text-center text-sm text-muted-foreground bg-muted/10 mt-auto">
          <div className="container mx-auto">
            Built for Google AI Hackathon | Powered by Gemini
          </div>
        </footer>
      </body>
    </html>
  );
}
