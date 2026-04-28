"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StackItem } from "@/lib/types";
import { X, Activity, Zap, TrendingDown } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [tools, setTools] = useState<StackItem[]>([]);
  const [toolName, setToolName] = useState("");
  const [category, setCategory] = useState<StackItem["category"] | "">("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    const savedStack = localStorage.getItem("stack");
    if (savedStack) {
      try {
        setTools(JSON.parse(savedStack));
      } catch (e) {
        // failed to parse
      }
    }
  }, []);

  const handleAddTool = () => {
    if (!toolName || !category || !cost) return;
    const newTool: StackItem = {
      id: Math.random().toString(36).substring(7),
      name: toolName,
      category: category as StackItem["category"],
      monthlyCost: parseFloat(cost),
    };
    const updated = [...tools, newTool];
    setTools(updated);
    localStorage.setItem("stack", JSON.stringify(updated));
    setToolName("");
    setCategory("");
    setCost("");
  };

  const handleRemoveTool = (id: string) => {
    const updated = tools.filter((t) => t.id !== id);
    setTools(updated);
    localStorage.setItem("stack", JSON.stringify(updated));
  };

  const handleAnalyzeFn = () => {
    localStorage.setItem("stack", JSON.stringify(tools));
    router.push("/alerts");
  };

  const totalCost = tools.reduce((acc, curr) => acc + curr.monthlyCost, 0);

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center">
      <div className="text-center max-w-3xl mb-16 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          AI That Watches <br/> <span className="text-blue-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Your Tech Stack</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Stop wasting 4 hours reading news. Get only what affects YOUR stack.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="flex flex-col items-center space-y-3 p-4 bg-secondary/50 rounded-2xl border border-border/50 shadow-sm transition-all hover:scale-105">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Activity size={24} /></div>
            <h3 className="font-semibold">Real-time News</h3>
          </div>
          <div className="flex flex-col items-center space-y-3 p-4 bg-secondary/50 rounded-2xl border border-border/50 shadow-sm transition-all hover:scale-105">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><Zap size={24} /></div>
            <h3 className="font-semibold">AI Analysis</h3>
          </div>
          <div className="flex flex-col items-center space-y-3 p-4 bg-secondary/50 rounded-2xl border border-border/50 shadow-sm transition-all hover:scale-105">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500"><TrendingDown size={24} /></div>
            <h3 className="font-semibold">Cost Impact</h3>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Add Your Tech Stack</CardTitle>
          <CardDescription>Tell us what you use, and we will monitor for changes that impact you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Tool Name</label>
              <Input placeholder="e.g., Vertex AI" value={toolName} onChange={(e) => setToolName(e.target.value)} />
            </div>
            <div className="space-y-2 w-full md:w-1/3">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={(val) => setCategory(val as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai-ml">AI/ML</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="hosting">Hosting</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full md:w-1/4">
              <label className="text-sm font-medium">Monthly Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input type="number" placeholder="0" className="pl-7" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddTool} variant="secondary" className="w-full md:w-auto mt-4 md:mt-0">Add Tool</Button>
          </div>

          <div className="pt-6">
            <h4 className="text-sm font-medium mb-3">Your Stack ({tools.length})</h4>
            {tools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg bg-muted/20">No tools added yet. Add your first tool above.</p>
            ) : (
              <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg min-h-[100px] content-start">
                {tools.map((tool) => (
                  <Badge key={tool.id} variant="secondary" className="px-3 py-1.5 text-sm flex items-center space-x-2 border-border/50 hover:bg-muted transition-colors">
                    <span>{tool.name}</span>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">{tool.category}</span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-green-400 font-medium">${tool.monthlyCost}/mo</span>
                    <button onClick={() => handleRemoveTool(tool.id)} className="ml-1 hover:bg-black/20 dark:hover:bg-white/20 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-all">
                      <X size={14} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-5 pt-5 border-t border-border/80 bg-muted/10 rounded-b-xl">
          <div className="flex justify-between items-center px-2">
            <span className="text-muted-foreground font-medium">Total Monthly Cost</span>
            <span className="text-3xl font-bold tracking-tight">${totalCost}</span>
          </div>
          <Button onClick={handleAnalyzeFn} disabled={tools.length === 0} className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            Analyze My Stack →
          </Button>
        </CardFooter>
      </Card>
      
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background"></div>
    </div>
  );
}
