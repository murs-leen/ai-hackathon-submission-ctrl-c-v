"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StackItem } from "@/lib/types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ArrowLeft, TrendingDown, DollarSign, BatteryCharging, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { getUserStacks } from "@/lib/firestore/stacks";


const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#ec4899"];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stack, setStack] = useState<StackItem[]>([]);
  const [balance, setBalance] = useState<string>("50000");

  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      if (user) {
        const uStack = await getUserStacks(user.uid);
        if (uStack.length === 0) { router.push("/"); return; }
        setStack(uStack);
      } else {
        const saved = localStorage.getItem("stack-sentinel:stack") || localStorage.getItem("stack");
        if (!saved || JSON.parse(saved).length === 0) {
          router.push("/");
        } else {
          setStack(JSON.parse(saved));
        }
      }
    };
    loadData();
  }, [user, authLoading, router]);

  const totalMonthlyCost = stack.reduce((sum, item) => sum + item.monthlyCost, 0);

  const categoryData = stack.reduce((acc, item) => {
    const existing = acc.find((d) => d.name === item.category);
    if (existing) existing.value += item.monthlyCost;
    else acc.push({ name: item.category, value: item.monthlyCost });
    return acc;
  }, [] as { name: string; value: number }[]);

  const runwayMonths = parseFloat(balance) / totalMonthlyCost;

  return (
    
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-4xl font-extrabold tracking-tight">Intelligence Dashboard</h1>
            </div>
            <p className="text-lg text-muted-foreground mt-1">Visualize your architectural spend and runway.</p>
          </div>
          <Button variant="outline" className="h-10" onClick={() => router.push("/")}>
             <ArrowLeft size={16} className="mr-2" /> Modify Stack
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br border-blue-500/30 from-blue-900/40 to-background shadow-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-blue-300/80 mb-2">Total Monthly Spend</p>
                  <p className="text-4xl font-black text-blue-50">${totalMonthlyCost.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl"><DollarSign size={24} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br border-indigo-500/30 from-indigo-900/40 to-background shadow-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300/80 mb-2">Active Components</p>
                  <p className="text-4xl font-black text-indigo-50">{stack.length} <span className="text-lg text-indigo-300/50">tools</span></p>
                </div>
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl"><BatteryCharging size={24} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br shadow-xl ${runwayMonths < 6 ? 'border-red-500/50 from-red-900/30' : 'border-green-500/30 from-green-900/30'} to-background`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${runwayMonths < 6 ? 'text-red-300/80' : 'text-green-300/80'}`}>Projected Runway</p>
                  <p className="text-4xl font-black">{isFinite(runwayMonths) ? runwayMonths.toFixed(1) : '∞'} <span className="text-lg opacity-50">months</span></p>
                </div>
                <div className={`p-3 rounded-xl ${runwayMonths < 6 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                   {runwayMonths < 6 ? <AlertCircle size={24} /> : <TrendingDown size={24} />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="border-border/60 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle>Spend by Category</CardTitle>
              <CardDescription>How much of your budget is captured per layer.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 h-[350px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`$${val}/mo`, 'Cost']} contentStyle={{ backgroundColor: 'rgb(2, 6, 23)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle>Individual Tool Costs</CardTitle>
              <CardDescription>Absolute comparative layout of component load.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stack} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{fill: 'rgba(255,255,255,0.4)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: 'rgba(255,255,255,0.4)'}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(val: any) => [`$${val}/mo`, 'Cost']} contentStyle={{ backgroundColor: 'rgb(2, 6, 23)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}/>
                  <Bar dataKey="monthlyCost" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
