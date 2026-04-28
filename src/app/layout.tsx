import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { Navbar } from "@/components/navbar";

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
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <footer className="py-6 border-t border-border text-center text-sm text-muted-foreground bg-muted/10 mt-auto">
            <div className="container mx-auto">
              Built for Google AI Hackathon | Powered by Gemini
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
