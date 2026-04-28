"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StackItem, SavedScenario } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, Save, Play, Search, AlertTriangle, ArrowUpRight, TrendingDown } from "lucide-react";

export default function WhatIfSimulator() {
  const router = useRouter();
  const [stack, setStack] = useState<StackItem[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [bankBalance, setBankBalance] = useState<number>(50000);
  
  const [action, setAction] = useState<"replace" | "remove" | "add">("replace");
  const [currentToolId, setCurrentToolId] = useState<string>("");
  const [replacementName, setReplacementName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SavedScenario | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("stack-sentinel:stack") || localStorage.getItem("stack");
    if (s) {
      const parsed = JSON.parse(s);
      setStack(parsed);
      if (parsed.length > 0) setCurrentToolId(parsed[0].id);
    }
    
    const sc = localStorage.getItem("stack-sentinel:scenarios");
    if (sc) setSavedScenarios(JSON.parse(sc));

    const bal = localStorage.getItem("stack-sentinel:bankBalance");
    if (bal) setBankBalance(Number(bal));
  }, []);

  const totalMonthlyCost = stack.reduce((sum, item) => sum + item.monthlyCost, 0);

  const calculateRunway = (burn: number) => {
    if (burn <= 0) return 999;
    return Math.floor((bankBalance / burn) * 4); // weeks
  };

  const handleSimulate = async () => {
    if ((action === "replace" || action === "remove") && !currentToolId) return;
    if ((action === "replace" || action === "add") && !replacementName) return;

    setLoading(true);
    setResult(null);

    const targetTool = action !== "add" ? stack.find(s => s.id === currentToolId) : null;

    try {
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          currentTool: targetTool,
          replacementTool: { name: replacementName },
          stack
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          id: Math.random().toString(36).substr(2, 9),
          currentToolName: targetTool?.name || "None",
          replacementToolName: action === "remove" ? "None" : replacementName,
          estimatedNewCost: data.estimatedNewCost,
          monthlySavings: data.monthlySavings,
          migrationComplexity: data.migrationComplexity,
          featureComparison: data.featureComparison,
          recommendation: data.recommendation,
          caveats: data.caveats || []
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentRunway = calculateRunway(totalMonthlyCost);
  const simulatedRunway = result ? calculateRunway(totalMonthlyCost - result.monthlySavings) : currentRunway;

  const handleSave = () => {
    if (!result) return;
    const update = [result, ...savedScenarios];
    setSavedScenarios(update);
    localStorage.setItem("stack-sentinel:scenarios", JSON.stringify(update));
    // Clear current result
    setResult(null);
    setReplacementName("");
  };

  const applyScenario = (s: SavedScenario) => {
     let newStack = [...stack];
     if (s.currentToolName !== "None") {
         // Modify or Remove
         if (s.replacementToolName === "None") {
             newStack = newStack.filter(item => item.name !== s.currentToolName);
         } else {
             const idx = newStack.findIndex(item => item.name === s.currentToolName);
             if (idx >= 0) {
                 newStack[idx] = { ...newStack[idx], name: s.replacementToolName, monthlyCost: s.estimatedNewCost };
             }
         }
     } else {
         // Add
         newStack.push({ id: Math.random().toString(), name: s.replacementToolName, category: "other", monthlyCost: s.estimatedNewCost });
     }
     
     setStack(newStack);
     localStorage.setItem("stack-sentinel:stack", JSON.stringify(newStack));
     
     // Remove from saved scenarios
     const r = savedScenarios.filter(sc => sc.id !== s.id);
     setSavedScenarios(r);
     localStorage.setItem("stack-sentinel:scenarios", JSON.stringify(r));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">What-If Simulator</h1>
        <p className="text-lg text-muted-foreground mt-1">Simulate switching tools to extend your runway.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Component */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-card shadow-lg border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center space-x-2">
                <Search size={20} className="text-blue-500" />
                <span>Scenario Builder</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-muted-foreground">Action</span>
                <select 
                  className="w-full h-11 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                >
                  <option value="replace">Replace existing tool</option>
                  <option value="remove">Remove tool entirely</option>
                  <option value="add">Add new tool</option>
                </select>
              </div>

              {action !== "add" && (
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-muted-foreground">Target Tool</span>
                  <select 
                    className="w-full h-11 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    value={currentToolId}
                    onChange={(e) => setCurrentToolId(e.target.value)}
                  >
                    {!currentToolId && <option value="" disabled>Select a tool</option>}
                    {stack.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (${s.monthlyCost}/mo)</option>
                    ))}
                  </select>
                </div>
              )}

              {action !== "remove" && (
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-muted-foreground">Replacement / New Tool</span>
                  <Input 
                    placeholder="e.g. Supabase, Claude 3"
                    value={replacementName}
                    onChange={(e) => setReplacementName(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button onClick={handleSimulate} disabled={loading || (action !== "remove" && !replacementName)} className="w-full h-12 text-sm font-bold shadow-md">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Simulating...</> : <><Play className="mr-2 h-4 w-4"/> Calculate Impact</>}
              </Button>
            </CardFooter>
          </Card>

          {/* Current Runway Quick Summary */}
          <Card className="bg-card/40 border-border/30">
            <CardContent className="pt-6">
               <h4 className="text-xs uppercase font-bold text-muted-foreground mb-3 text-center tracking-widest">Base Economics</h4>
               <div className="flex justify-between items-center px-4">
                 <div className="text-center">
                   <div className="text-xl font-bold">${totalMonthlyCost}</div>
                   <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Burn / mo</div>
                 </div>
                 <div className="h-8 border-l border-border/50"></div>
                 <div className="text-center">
                   <div className="text-xl font-bold">{currentRunway}</div>
                   <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Weeks Left</div>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column Content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {loading && (
             <Card className="bg-card/50 border-blue-500/20 backdrop-blur-sm self-stretch flex-1 flex flex-col justify-center items-center py-20 min-h-[400px]">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-foreground">Grounding Impact Assessment...</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-[300px] text-center">Fetching current prices and evaluating architectural migration complexities.</p>
             </Card>
          )}

          {!loading && !result && (
             <div className="bg-secondary/30 border border-border/40 border-dashed rounded-2xl self-stretch flex-1 flex flex-col justify-center items-center py-20 min-h-[400px] opacity-70">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-xl font-bold text-muted-foreground">Run a scenario to see AI impact analysis</h3>
             </div>
          )}

          {!loading && result && (
            <Card className="bg-card shadow-2xl border-blue-500/30 overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="bg-blue-500/10 p-6 border-b border-border/40">
                <Badge variant="outline" className="mb-3 bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold uppercase tracking-wider text-[10px]">Simulation Complete</Badge>
                <div className="flex justify-between items-end">
                   <div>
                    <h3 className="text-2xl font-extrabold flex items-center gap-2">
                     {action === "replace" ? `${result.currentToolName} ` : (action === "remove" ? `Remove ${result.currentToolName}` : `Add ${result.replacementToolName}`)}
                     {action === "replace" && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
                     {action === "replace" && result.replacementToolName}
                    </h3>
                   </div>
                </div>
              </div>

              <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-border/50 border-b border-border/50">
                  <div className="p-6 bg-secondary/20 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Current State</span>
                    <span className="text-3xl font-extrabold line-through decoration-red-500/40 text-muted-foreground mb-1">${totalMonthlyCost}/mo</span>
                    <span className="text-sm font-medium text-muted-foreground">{currentRunway} weeks runway</span>
                  </div>
                  <div className="p-6 bg-green-500/5 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-2">Projected State</span>
                    <span className="text-4xl font-extrabold text-green-400 mb-1">${totalMonthlyCost - result.monthlySavings}/mo</span>
                    <span className="text-sm font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full">{simulatedRunway} weeks runway (+{simulatedRunway - currentRunway})</span>
                  </div>
                </div>

                <div className="p-6 space-y-6 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                       AI Assessment
                       <span className={`px-2 py-1 rounded text-[10px]${result.migrationComplexity==='low'?'bg-green-500/20 text-green-400':(result.migrationComplexity==='high'?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-500')}`}>
                         {result.migrationComplexity} complexity
                       </span>
                    </h4>
                    <p className="text-foreground/90 leading-relaxed p-4 bg-secondary rounded-lg border border-border/60">{result.recommendation}</p>
                  </div>
                  
                  {result.featureComparison && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground">Feature Comparison</h4>
                      <p className="text-foreground/80 leading-relaxed text-sm">{result.featureComparison}</p>
                    </div>
                  )}

                  {result.caveats && result.caveats.length > 0 && (
                     <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20 space-y-2">
                       <h4 className="font-bold text-[10px] uppercase tracking-widest text-orange-500 flex items-center gap-1.5"><AlertTriangle size={14}/> Caveats to consider</h4>
                       <ul className="text-orange-400/90 text-sm list-disc pl-5 space-y-1">
                         {result.caveats.map((c, i) => <li key={i}>{c}</li>)}
                       </ul>
                     </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-card p-6 border-t border-border/50 gap-4">
                <Button className="flex-1 h-12 shadow-md hover:scale-105 transition-transform font-bold tracking-wide" onClick={handleSave}>
                   <Save className="w-4 h-4 mr-2" /> Save Scenario
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Saved Scenarios List */}
          {savedScenarios.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-4">Saved Scenarios</h3>
              <div className="space-y-3">
                {savedScenarios.map(sc => (
                  <div key={sc.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center shadow-sm hover:border-primary/30 transition-colors gap-4">
                    <div>
                      <div className="font-bold text-base flex items-center flex-wrap gap-2">
                        {sc.currentToolName !== "None" ? sc.currentToolName : "Add"} 
                        {sc.currentToolName !== "None" && sc.replacementToolName !== "None" && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                        {sc.replacementToolName !== "None" ? sc.replacementToolName : "Remove"}
                        
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-5 ${sc.monthlySavings > 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                           {sc.monthlySavings > 0 ? `Save $${sc.monthlySavings}/mo` : `+${Math.abs(sc.monthlySavings)}/mo`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{sc.recommendation}</p>
                    </div>
                    <Button variant="secondary" size="sm" className="shrink-0 w-full sm:w-auto font-bold" onClick={() => applyScenario(sc)}>
                       Apply Stack <ArrowUpRight className="ml-1 w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
