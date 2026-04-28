"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, Settings, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-xl flex flex-col justify-center text-primary tracking-tight hover:opacity-80 transition-opacity">
          <span>Stack<span className="text-blue-500">Sentinel</span></span>
        </Link>
        <nav className="flex space-x-6 text-sm font-medium items-center">
          <Link href="/alerts" className="text-muted-foreground hover:text-foreground transition-colors">Alerts</Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/history" className="text-muted-foreground hover:text-foreground transition-colors">History</Link>
          <Link href="/what-if" className="text-muted-foreground hover:text-foreground transition-colors">What-If</Link>
          
          <div className="w-px h-6 bg-border mx-2"></div>
          
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-2 p-1 pl-2 pr-4 bg-secondary/80 rounded-full border border-border/50 hover:bg-secondary transition-all">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-border/80" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center"><UserIcon size={14}/></div>
                )}
                <span className="text-xs font-bold max-w-[100px] truncate">{user.displayName || "User"}</span>
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right border border-border/60 bg-card shadow-xl rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/50 bg-secondary/30">
                  <p className="text-sm font-bold truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  <Link href="/settings" className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors">
                    <Settings justify-center size={16} /> 
                    Preferences
                  </Link>
                  <button onClick={signOut} className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
             <div className="flex items-center space-x-3">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 border border-border/50 px-2 py-0.5 rounded-sm">Demo Mode</span>
             </div>
          )}
        </nav>
      </div>
    </header>
  );
}
