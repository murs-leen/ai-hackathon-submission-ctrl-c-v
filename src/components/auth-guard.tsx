"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      // If Firebase is configured and user is fully logged out, kick them out.
      // If Firebase is NOT configured, we are locally in Demo mode, so let them passively stay.
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col text-muted-foreground animate-in fade-in">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <span className="font-bold tracking-widest text-sm uppercase">Authenticating Vault...</span>
      </div>
    );
  }

  // Allow native rendering if fallback mode is active or user securely signed in.
  if (!user && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return null;

  return <>{children}</>;
}
