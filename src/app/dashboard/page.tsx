"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnalyzedAlert, StackItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, TrendingDown, Clock, Download } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#64748b'];

export default function DashboardPage() {
  const router = useRouter();
  const [stack, setStack] = useState<StackItem[]>([]);
  const [alerts, setAlerts] = useState<AnalyzedAlert[]>([]);
  const [bankBalance, setBankBalance] = useState<number>(40000);

  useEffect(() => {
    const savedStack = localStorage.getItem("stack");
    const savedAlerts = localStorage.getItem("alerts");
    
    if (savedStack) {
      setStack(JSON.parse(savedStack));
    } else {
      router.push("/");
    }
    
    if (savedAlerts) {
      setAlerts(JSON.parse(savedAlerts));
    }
  }, [router]);

  // Calculations
  const monthlyCost = stack.reduce((sum, item) => sum + item.monthlyCost, 0);
  
  const potentialSavings = alerts
    .filter(a => a.costImpact && a.costImpact < 0)
    .reduce((sum, a) => sum + Math.abs(a.costImpact), 0);
    
  const afterSavingsCost = monthlyCost - potentialSavings;
  
  const currentRunwayWeeks = monthlyCost > 0 ? bankBalance / (monthlyCost * 4.33) : 0;
  const optimizedRunwayWeeks = afterSavingsCost > 0 ? bankBalance / (afterSavingsCost * 4.33) : 0;
  const runwayDiff = optimizedRunwayWeeks - currentRunwayWeeks;
  
  // Data for Category Pie Chart
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    stack.forEach(item => {
      catMap.set(item.category, (catMap.get(item.category) || 0) + item.monthlyCost);
    });
    return Array.from(catMap.entries()).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [stack]);

  // Data for Bar Chart
  const comparisonData = useMemo(() => {
    return stack.map(item => {
      let toolSavings = 0;
      const relevantAlerts = alerts.filter(a => a.affectedTool?.toLowerCase().includes(item.name.toLowerCase()));
      relevantAlerts.forEach(a => {
        if (a.costImpact < 0) {
          toolSavings += Math.abs(a.costImpact);
        }
      });
      // Safety bounds
      if (toolSavings > item.monthlyCost) toolSavings = item.monthlyCost;
      
      return {
        name: item.name,
        Current: item.monthlyCost,
        Optimized: item.monthlyCost - toolSavings
      };
    }).sort((a, b) => b.Current - a.Current);
  }, [stack, alerts]);

  if (stack.length === 0) return null; // loading or redirecting

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Cost Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-1">Track your stack costs and potential savings</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 select-none md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-card shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${monthlyCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-md border-green-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown className="h-16 w-16 text-green-500" />
          </div>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Potential Savings</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-green-500">${potentialSavings.toFixed(2)}</div>
              {monthlyCost > 0 && (
                <span className="text-sm font-semibold text-green-500/80">↓ {Math.round((potentialSavings / monthlyCost) * 100)}%</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">After Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">${afterSavingsCost.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Runway Impact</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-purple-500">+{runwayDiff > 0 ? Math.round(runwayDiff) : 0} wks</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(currentRunwayWeeks)} → {Math.round(optimizedRunwayWeeks)} weeks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Left: Cost Breakdown Pie Chart */}
        <Card className="bg-card/50 shadow-md">
          <CardHeader>
            <CardTitle>Cost by Category</CardTitle>
            <CardDescription>Monthly spend distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => [`$${value}`, "Cost"]}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right: Runway Calculator */}
        <Card className="bg-card/50 shadow-md flex flex-col">
          <CardHeader>
            <CardTitle>Runway Calculator</CardTitle>
            <CardDescription>See how savings extend your runway</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-4 mb-4">
              <label className="text-sm font-medium">Current Bank Balance ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">$</span>
                <Input 
                  type="number" 
                  className="pl-8 text-lg font-bold h-12 bg-background" 
                  value={bankBalance || ''} 
                  onChange={(e) => setBankBalance(Number(e.target.value))} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
               <div className="bg-background border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-sm text-muted-foreground font-medium mb-1">Current Runway</span>
                  <span className="text-3xl font-bold">{Math.round(currentRunwayWeeks)} <span className="text-base font-normal">wks</span></span>
                  <span className="text-xs text-muted-foreground mt-1">({(currentRunwayWeeks / 4.33).toFixed(1)} months)</span>
               </div>
               
               <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent"></div>
                  <span className="text-sm text-purple-400 font-medium mb-1 relative z-10">After Savings</span>
                  <span className="text-3xl font-bold text-purple-500 relative z-10">{Math.round(optimizedRunwayWeeks)} <span className="text-base font-normal">wks</span></span>
                  <span className="text-xs text-purple-400/80 mt-1 relative z-10">({(optimizedRunwayWeeks / 4.33).toFixed(1)} months)</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Cost Comparison Bar Chart */}
      <Card className="bg-card/50 shadow-md">
        <CardHeader>
          <CardTitle>Monthly Cost: Current vs Optimized</CardTitle>
          <CardDescription>Impact of adopting AI recommendations per tool</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparisonData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(value) => `$${value}`} stroke="var(--muted-foreground)" />
              <YAxis dataKey="name" type="category" width={120} stroke="var(--muted-foreground)" />
              <RechartsTooltip 
                formatter={(value: any) => [`$${value}`, ""]}
                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                cursor={{fill: 'var(--muted)', opacity: 0.2}}
              />
              <Legend />
              <Bar dataKey="Current" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              <Bar dataKey="Optimized" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" onClick={() => router.push("/alerts")} className="h-12 px-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Alerts
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")} className="h-12 px-6">
          Edit My Stack
        </Button>
        <Button variant="default" className="h-12 px-6 ml-auto bg-blue-600 hover:bg-blue-500 text-white" onClick={() => {
           alert("Coming in Phase 2!");
        }}>
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>
    </div>
  );
}
