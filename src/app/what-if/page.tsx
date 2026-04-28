"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SavedScenario, StackItem } from "@/lib/types";
import { ArrowLeft, Loader2, PlayCircle, Plus, Sparkles, X, CheckCircle2, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { getUserStacks, updateStackItem, addStackItem, deleteStackItem } from "@/lib/firestore/stacks";
import { getSavedScenarios, addSavedScenario, markScenarioApplied } from "@/lib/firestore/scenarios";


export default function WhatIfPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [stack, setStack] = useState<StackItem[]>([]);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  
  // Builder State
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [replacementName, setReplacementName] = useState("");
  const [replacementCost, setReplacementCost] = useState("");
  const [replacementCategory, setReplacementCategory] = useState("");
  
  // Analysis State
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    const loadState = async () => {
      if (user) {
        const uStack = await getUserStacks(user.uid);
        setStack(uStack);
        const sData = await getSavedScenarios(user.uid);
        setScenarios(sData);
      } else {
        const s = localStorage.getItem("stack-sentinel:stack") || localStorage.getItem("stack");
        if (s) setStack(JSON.parse(s));
        const savedS = localStorage.getItem("stack-sentinel:scenarios");
        if (savedS) setScenarios(JSON.parse(savedS));
      }
    };
    loadState();
  }, [user, authLoading]);

  const simulateImpact = async () => {
    if (!selectedTool || !replacementName || !replacementCost || !replacementCategory) return;
    
    setLoading(true);
    try {
      const targetTool = stack.find(t => t.id === selectedTool);
      
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type" : "application/json" },
        body: JSON.stringify({
          currentTool: targetTool,
          replacementTool: { name: replacementName, category: replacementCategory, monthlyCost: parseFloat(replacementCost) }
        })
      });
      
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveScenario = async () => {
    if (!analysis) return;
    const targetTool = stack.find(t => t.id === selectedTool);
    const newScenario = {
      scenarioId: Math.random().toString(36).substring(7),
      currentTool: targetTool?.name || "",
      replacementTool: replacementName,
      estimatedSavings: analysis.costDifference,
      isApplied: false,
      createdAt: new Date().toISOString()
    };
    
    setScenarios([newScenario, ...scenarios]);
    if (user) {
       await addSavedScenario(user.uid, newScenario as any); 
       // re-fetch to get real ID
       setScenarios(await getSavedScenarios(user.uid));
    } else {
       localStorage.setItem("stack-sentinel:scenarios", JSON.stringify([newScenario, ...scenarios]));
    }
  };

  const applyScenario = async (scenario: SavedScenario) => {
    const sTool = stack.find(t => t.name === scenario.currentTool);
    
    let nextStack = stack;
    
    if (user) {
       if (sTool) await deleteStackItem(user.uid, sTool.id);
       await addStackItem(user.uid, {
         name: scenario.replacementTool,
         category: sTool ? sTool.category : 'other',
         monthlyCost: sTool ? (sTool.monthlyCost - scenario.estimatedSavings) : 0
       });
       await markScenarioApplied(user.uid, scenario.id || scenario.scenarioId || "");
       setStack(await getUserStacks(user.uid));
       setScenarios(await getSavedScenarios(user.uid));
    } else {
       if (sTool) nextStack = nextStack.filter(t => t.id !== sTool.id);
       nextStack.push({
         id: Math.random().toString(36).substring(7),
         name: scenario.replacementTool,
         category: sTool ? sTool.category : 'other',
         monthlyCost: sTool ? (sTool.monthlyCost - scenario.estimatedSavings) : 0
       });
       setStack(nextStack);
       localStorage.setItem("stack-sentinel:stack", JSON.stringify(nextStack));
       
       const nextScens = scenarios.map(s => s.scenarioId === scenario.scenarioId ? { ...s, isApplied: true } : s);
       setScenarios(nextScens);
       localStorage.setItem("stack-sentinel:scenarios", JSON.stringify(nextScens));
    }
  };

  return (
    
      <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight">What-If Simulator</h1>
          <p className="text-muted-foreground mt-2">Mathematically project the impact of migrating tooling.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-card/50 backdrop-blur-sm border-blue-500/20 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <PlayCircle className="w-48 h-48 text-blue-500" />
             </div>
             <CardHeader>
               <CardTitle className="text-2xl text-blue-50 font-bold">Scenario Builder</CardTitle>
               <CardDescription>Select an existing tool and configure its theoretical replacement.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6 relative z-10">
                <div className="space-y-3">
                   <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Modify Existing Target</label>
                   <Select value={selectedTool} onValueChange={(val) => setSelectedTool(val || '')}>
                     <SelectTrigger className="h-12 border-border/50 bg-secondary/30"><SelectValue placeholder="Select a tool from your stack..." /></SelectTrigger>
                     <SelectContent>
                       {stack.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (${s.monthlyCost}/mo)</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>

                {selectedTool && (
                  <div className="p-5 border border-border/40 rounded-2xl bg-secondary/10 space-y-4">
                     <h4 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Projected Replacement</h4>
                     <div className="space-y-2">
                       <Input placeholder="Replacement Tool Name (e.g. Supabase)" value={replacementName} onChange={(e)=>setReplacementName(e.target.value)} />
                     </div>
                     <div className="flex gap-4">
                        <Input type="number" placeholder="New Monthly Cost" value={replacementCost} onChange={(e)=>setReplacementCost(e.target.value)} />
                        <Input placeholder="Category" value={replacementCategory} onChange={(e)=>setReplacementCategory(e.target.value)} />
                     </div>
                     
                     <Button onClick={simulateImpact} disabled={loading || !replacementName || !replacementCost} className="w-full h-12 bg-blue-600 hover:bg-blue-500 mt-2 font-bold text-md">
                       {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run AI Simulation"}
                     </Button>
                  </div>
                )}
             </CardContent>
          </Card>

          <div className="space-y-8">
            {analysis && (
              <Card className="border-green-500/20 bg-card/80 backdrop-blur-sm shadow-xl animate-in slide-in-from-right-8 fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="text-blue-400" /> Grounded Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Cost Delta</h4>
                    <div className={`text-3xl font-black ${analysis.costDifference > 0 ? "text-green-500" : "text-red-500"}`}>
                      {analysis.costDifference > 0 ? "+" : ""}${analysis.costDifference}/mo
                      <span className="text-sm font-medium opacity-70 ml-2">(${analysis.yearlyDifference}/yr)</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-secondary/30 p-4 rounded-xl border border-border/40">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Migration Complexity</div>
                        <div className="font-bold">{analysis.migrationComplexity}</div>
                     </div>
                     <div className="bg-secondary/30 p-4 rounded-xl border border-border/40">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Time to Migrate</div>
                        <div className="font-bold">{analysis.estimatedTime}</div>
                     </div>
                  </div>
                  
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="text-[10px] uppercase font-bold text-yellow-500/80 mb-2">Caveats & Traps</div>
                    <p className="text-sm text-yellow-100/90">{analysis.caveats}</p>
                  </div>

                  <Button variant="secondary" onClick={saveScenario} className="w-full h-12 font-bold">Save this Architecture State</Button>
                </CardContent>
              </Card>
            )}

            {scenarios.length > 0 && (
               <Card className="border-border/50">
                 <CardHeader><CardTitle className="text-xl">Saved Scenarios</CardTitle></CardHeader>
                 <CardContent className="space-y-3">
                   {scenarios.map((scen, idx) => (
                     <div key={idx} className="p-4 bg-secondary/20 border border-border/40 rounded-xl flex justify-between items-center group hover:bg-secondary/40 transition">
                        <div>
                           <div className="font-bold flex items-center gap-2">
                             <span className="line-through opacity-50">{scen.currentTool}</span>
                             <ArrowRight size={14} className="text-blue-500" />
                             <span>{scen.replacementTool}</span>
                           </div>
                           <p className={`text-xs font-bold mt-1 ${scen.estimatedSavings > 0 ? 'text-green-400' : 'text-red-400'}`}>${scen.estimatedSavings}/mo impact</p>
                        </div>
                        <Button disabled={scen.isApplied} onClick={() => applyScenario(scen)} variant={scen.isApplied ? "ghost" : "default"} size="sm" className="font-bold shadow-sm">
                           {scen.isApplied ? <span className="flex items-center gap-1 text-green-500"><CheckCircle2 size={14}/> Applied</span> : "Apply Globally"}
                        </Button>
                     </div>
                   ))}
                 </CardContent>
               </Card>
            )}
          </div>
        </div>
      </div>
    
  );
}
