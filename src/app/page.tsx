"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { StackItem } from "@/lib/types";
import { X, Activity, Zap, TrendingDown, LogIn, ArrowRight, Loader2, Database } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getUserStacks, addStackItem, deleteStackItem } from "@/lib/firestore/stacks";
import { migrateLocalStorageToFirestore } from "@/lib/firestore/migration";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn } = useAuth();
  const [tools, setTools] = useState<StackItem[]>([]);
  const [toolName, setToolName] = useState("");
  const [category, setCategory] = useState<StackItem["category"] | "">("");
  const [cost, setCost] = useState("");
  
  const [showDemo, setShowDemo] = useState(false);
  const [migrationPrompt, setMigrationPrompt] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const initData = async () => {
      setGlobalLoading(true);
      try {
        if (user) {
          // Logged in: Check migration or load stacks
          const localStack = localStorage.getItem("stack-sentinel:stack") || localStorage.getItem("stack");
          const hasLocal = localStack && JSON.parse(localStack).length > 0;
          
          const existingNode = await getUserStacks(user.uid);
          
          if (existingNode.length === 0 && hasLocal) {
             setMigrationPrompt(true);
          } else {
             setTools(existingNode);
             // Already onboarded, redirect to dashboard automatically
             if (existingNode.length > 0) {
               setGlobalLoading(false);
               router.push('/dashboard');
               return;
             }
          }
        } else {
          // Not logged in: Check if they were already in demo mode
          const savedStack = localStorage.getItem("stack-sentinel:stack") || localStorage.getItem("stack");
          if (savedStack) {
            try {
              const parsed = JSON.parse(savedStack);
              if (parsed.length > 0) {
                setTools(parsed);
                setShowDemo(true);
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error("Firestore Loading Error:", e);
        // Fallback to demo mode on DB errors
        setShowDemo(true); 
      } finally {
        setGlobalLoading(false);
      }
    };

    initData();
  }, [user, authLoading, router]);

  const handleMigration = async (accept: boolean) => {
     setIsMigrating(true);
     if (accept && user) {
        await migrateLocalStorageToFirestore(user.uid);
        localStorage.removeItem("stack-sentinel:stack");
        localStorage.removeItem("stack");
        const updatedNode = await getUserStacks(user.uid);
        setTools(updatedNode);
     } else if (!accept && user) {
        localStorage.removeItem("stack-sentinel:stack");
        localStorage.removeItem("stack");
     }
     setMigrationPrompt(false);
     setIsMigrating(false);
  };

  const handleAddTool = async () => {
    if (!toolName || !category || !cost) return;
    
    const tempId = Math.random().toString(36).substring(7);
    const newTool: StackItem = {
      id: tempId,
      name: toolName,
      category: category as StackItem["category"],
      monthlyCost: parseFloat(cost),
    };
    
    // Optimistic UI update first — always show the new tool
    const updatedTools = [...tools, newTool];
    setTools(updatedTools);
    setToolName("");
    setCategory("");
    setCost("");

    if (user) {
      try {
        const realId = await addStackItem(user.uid, newTool);
        setTools(prev => prev.map(t => t.id === tempId ? { ...t, id: realId } : t));
      } catch (e) {
        // Firestore unavailable — persist locally instead
        console.warn("Firestore write failed, saving locally:", e);
        localStorage.setItem("stack-sentinel:stack", JSON.stringify(updatedTools));
      }
    } else {
      localStorage.setItem("stack-sentinel:stack", JSON.stringify(updatedTools));
    }
  };

  const handleRemoveTool = async (id: string) => {
    const filtered = tools.filter((t) => t.id !== id);
    setTools(filtered);
    if (user) {
      try {
        await deleteStackItem(user.uid, id);
      } catch (e) {
        localStorage.setItem("stack-sentinel:stack", JSON.stringify(filtered));
      }
    } else {
      localStorage.setItem("stack-sentinel:stack", JSON.stringify(filtered));
    }
  };

  const handleAnalyzeFn = () => {
    if (!user) localStorage.setItem("stack-sentinel:stack", JSON.stringify(tools));
    router.push("/alerts");
  };

  const totalCost = tools.reduce((acc, curr) => acc + curr.monthlyCost, 0);

  if (authLoading || globalLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
  }

  // --- MIGRATION UI ---
  if (migrationPrompt) {
    return (
      <div className="container mx-auto px-4 py-24 flex items-center justify-center animate-in fade-in duration-500">
        <Card className="w-full max-w-lg border-blue-500/30 shadow-2xl bg-card border-2">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-blue-500">
              <Database size={32} />
            </div>
            <CardTitle className="text-2xl">Welcome to Stack Sentinel!</CardTitle>
            <CardDescription className="text-base text-foreground/80 pt-2">
              We found existing local data on this device. Would you like to import it to your new secure account?
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-3 pt-6">
            <Button disabled={isMigrating} onClick={() => handleMigration(true)} className="w-full h-12 text-md font-bold bg-blue-600 hover:bg-blue-500">
               {isMigrating ? <Loader2 className="w-5 h-5 animate-spin"/> : "Yes, Import Data"}
            </Button>
            <Button disabled={isMigrating} variant="outline" onClick={() => handleMigration(false)} className="w-full h-12 text-md font-semibold border-border/50">
               No, Start Fresh
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- LOGIN HERO UI ---
  if (!user && !showDemo) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center">
        <div className="text-center max-w-3xl mb-12 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            AI That Watches <br/> <span className="text-blue-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 drop-shadow-sm">Your Tech Stack</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Stop wasting hours reading arbitrary tech news. Get AI-filtered, personalized intelligence on what strictly affects your stack&apos;s architecture.
          </p>
        </div>

        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden group">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="flex flex-col items-center pt-10 pb-8 px-8 space-y-8">
            <Button onClick={signIn} className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-gray-200 shadow-xl rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571c.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              Sign in with Google
            </Button>

            <div className="flex items-center w-full gap-4 text-muted-foreground/60">
               <div className="h-px bg-border flex-1"></div>
               <span className="text-xs uppercase tracking-widest font-semibold">Or</span>
               <div className="h-px bg-border flex-1"></div>
            </div>

            <Button onClick={() => setShowDemo(true)} variant="outline" className="w-full h-12 text-md font-medium border-border hover:bg-secondary">
              Try Demo Mode (Local Only)
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-6">
              By signing in, you are securely authenticated via identity providers unlocking cross-device data persistence.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-4xl w-full">
          {[
             {icon: Activity, title: "Real-time Grounding", color: "blue", text: "AI actively searches live sources verifying intelligence." },
             {icon: Database, title: "Persistent History", color: "indigo", text: "Track your actions and monitor cumulative infrastructure savings." },
             {icon: TrendingDown, title: "What-If Simulator", color: "green", text: "Mathematically predict the structural costs of tool migrations." }
          ].map((feature, i) => (
             <div key={i} className="flex flex-col items-center space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border/50 text-center hover:bg-secondary/50 transition-colors">
               <div className={`p-4 bg-${feature.color}-500/10 rounded-2xl text-${feature.color}-500 shadow-sm`}>
                 <feature.icon size={28} />
               </div>
               <h3 className="font-bold text-lg">{feature.title}</h3>
               <p className="text-sm text-muted-foreground leading-relaxed">{feature.text}</p>
             </div>
          ))}
        </div>
      </div>
    );
  }

  // --- STACK ADDER UI (DEMO OR LOGGED IN) ---
  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center">
      <div className="w-full flex justify-between items-center max-w-2xl mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">{user ? 'Your' : 'Demo'} Stack Config</h2>
          <p className="text-muted-foreground">{user ? 'Secured in the Cloud.' : 'Running locally in your browser.'}</p>
        </div>
        {user && (
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="gap-2 font-semibold">
            Dashboard <ArrowRight size={16}/>
          </Button>
        )}
      </div>

      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Add Frameworks & Tools</CardTitle>
          <CardDescription>We will monitor Gemini for changes that impact these exact components.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Tool Name</label>
              <Input placeholder="e.g., Vertex AI" value={toolName} onChange={(e) => setToolName(e.target.value)} />
            </div>
            <div className="space-y-2 w-full md:w-1/3">
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select...</option>
                <option value="ai-ml">AI/ML</option>
                <option value="database">Database</option>
                <option value="hosting">Hosting</option>
                <option value="auth">Auth</option>
                <option value="payment">Payment</option>
                <option value="analytics">Analytics</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2 w-full md:w-1/4">
              <label className="text-sm font-medium">Monthly Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input type="number" placeholder="0" className="pl-7" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddTool} variant="secondary" className="w-full md:w-auto mt-4 md:mt-0 shadow-sm">Add Tool</Button>
          </div>

          <div className="pt-6">
            <h4 className="text-sm font-medium mb-3 flex items-center justify-between">
              Your Infrastructure ({tools.length})
              {user && <Badge variant="secondary" className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] uppercase">Cloud Synced</Badge>}
            </h4>
            {tools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border/60 rounded-xl bg-muted/10">No tools added yet. Try mapping your stack above.</p>
            ) : (
              <div className="flex flex-wrap gap-2 p-4 bg-muted/20 border border-border/40 rounded-xl min-h-[100px] content-start">
                {tools.map((tool) => (
                  <Badge key={tool.id} variant="secondary" className="px-3 py-1.5 text-sm flex items-center space-x-2 border-border/60 shadow-sm bg-card transition-colors">
                    <span className="font-bold text-foreground">{tool.name}</span>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider bg-secondary/80 px-1.5 py-0.5 rounded-sm">{tool.category}</span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-green-500 font-bold">${tool.monthlyCost}/mo</span>
                    <button onClick={() => handleRemoveTool(tool.id)} className="ml-1 hover:bg-red-500/10 p-1 rounded-full text-muted-foreground hover:text-red-500 transition-all">
                      <X size={14} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-5 pt-6 pb-6 border-t border-border bg-card/60 rounded-b-xl">
          <div className="flex justify-between items-center px-2">
            <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Total Monthly Burn</span>
            <span className="text-3xl font-extrabold tracking-tight text-foreground">${totalCost}</span>
          </div>
          <Button onClick={handleAnalyzeFn} disabled={tools.length === 0} className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
            Analyze {user ? "" : "Local"} Stack →
          </Button>
        </CardFooter>
      </Card>
      
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background"></div>
    </div>
  );
}
