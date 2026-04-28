"use client";

import { useEffect, useState } from "react";
import { AlertHistory, AlertHistoryItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, History, XCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";

export default function AlertHistoryPage() {
  const [history, setHistory] = useState<AlertHistory>({ items: [], totalSavingsAchieved: 0, totalAlertsActedOn: 0 });
  const [filter, setFilter] = useState<'all' | 'acted' | 'pending' | 'dismissed'>('all');

  useEffect(() => {
    const saved = localStorage.getItem("stack-sentinel:history");
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your alert history? This cannot be undone.")) {
       const empty = { items: [], totalSavingsAchieved: 0, totalAlertsActedOn: 0 };
       setHistory(empty);
       localStorage.setItem("stack-sentinel:history", JSON.stringify(empty));
    }
  };

  const filteredItems = history.items.filter(item => filter === 'all' || item.status === filter);
  
  // Dummy data for savings over time if history is too sparse for a real line chart
  const timelineData = history.items
        .filter(item => item.status === 'acted' && item.actedAt)
        .sort((a,b) => new Date(a.actedAt!).getTime() - new Date(b.actedAt!).getTime())
        .reduce((acc, item) => {
            const date = new Date(item.actedAt!).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
            const lastTotal = acc.length > 0 ? acc[acc.length-1].total : 0;
            acc.push({ date, amount: item.savingsAchieved || 0, total: lastTotal + (item.savingsAchieved || 0) });
            return acc;
        }, [] as {date: string, amount: number, total: number}[]);

  // If no realistic history items, mock for the hackathon demo if we have 0 real acted items but history isn't completely empty
  const chartData = timelineData.length > 1 ? timelineData : [
      { date: 'Jan 1', total: 0 },
      { date: 'Feb 15', total: history.totalSavingsAchieved > 0 ? history.totalSavingsAchieved / 3 : 50 },
      { date: 'Mar 10', total: history.totalSavingsAchieved > 0 ? (history.totalSavingsAchieved / 3) * 2 : 120 },
      { date: 'Today', total: history.totalSavingsAchieved > 0 ? history.totalSavingsAchieved : 340 }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Alert History</h1>
          <p className="text-lg text-muted-foreground mt-1">Track actions taken and measure your cumulative optimization impact.</p>
        </div>
        <Button onClick={clearHistory} variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
           Clear History
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Total Alerts</span>
            <span className="text-4xl font-extrabold">{history.items.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-blue-500/30">
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-blue-400">Acted On</span>
            <span className="text-4xl font-extrabold text-blue-500">{history.totalAlertsActedOn}</span>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 shadow-sm border-green-500/30 ring-1 ring-inset ring-green-500/10 relative overflow-hidden">
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2 relative z-10">
            <span className="text-[11px] font-bold tracking-widest uppercase text-green-500">Savings Achieved</span>
            <span className="text-4xl font-extrabold text-green-400">${history.totalSavingsAchieved}<span className="text-lg text-green-500/60 ml-1">/mo</span></span>
          </CardContent>
          <TrendingUp className="absolute -bottom-4 -right-4 w-24 h-24 text-green-500/10" />
        </Card>
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Ignored</span>
            <span className="text-4xl font-extrabold">{history.items.filter(i => i.status === 'dismissed').length}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex space-x-2 bg-secondary p-1 rounded-lg w-fit border border-border/50">
            {(['all', 'acted', 'pending', 'dismissed'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all duration-200 ${filter === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <Card className="bg-card border-border/40 shadow-xl overflow-hidden">
             {filteredItems.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-24 text-center opacity-70">
                    <History className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-bold">No history records found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Actions taken on alerts will appear here.</p>
                 </div>
             ) : (
                 <div className="divide-y divide-border/50">
                    {filteredItems.slice().reverse().map(item => (
                       <div key={item.id} className="p-6 hover:bg-muted/10 transition-colors flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                          <div className="space-y-1">
                             <div className="flex items-center space-x-3 mb-2">
                                <span className="text-xs font-semibold text-muted-foreground">
                                   {item.actedAt ? new Date(item.actedAt).toLocaleDateString() : (item.dismissedAt ? new Date(item.dismissedAt).toLocaleDateString() : 'N/A')}
                                </span>
                                {item.status === 'acted' && <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] uppercase font-bold tracking-widest"><CheckCircle2 className="w-3 h-3 mr-1"/> Acted On</Badge>}
                                {item.status === 'pending' && <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 text-[10px] uppercase font-bold tracking-widest">Pending</Badge>}
                                {item.status === 'dismissed' && <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest"><XCircle className="w-3 h-3 mr-1 opacity-50"/> Dismissed</Badge>}
                             </div>
                             <h4 className="text-lg font-bold text-foreground flex items-center">{item.alert.newsItem?.title || `Update on ${item.alert.affectedTool}`}</h4>
                             {item.status === 'acted' && item.savingsAchieved ? (
                                <p className="text-sm font-semibold text-green-400 mt-2">→ Saved ${item.savingsAchieved}/month</p>
                             ) : item.status === 'dismissed' && item.dismissReason ? (
                                <p className="text-sm text-muted-foreground italic mt-2">Reason: {item.dismissReason}</p>
                             ) : null}
                          </div>
                       </div>
                    ))}
                 </div>
             )}
          </Card>
        </div>

        <div className="lg:col-span-1">
           <Card className="bg-card border-border/40 shadow-xl sticky top-24">
             <CardHeader className="pb-2 text-center">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex justify-center items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Savings Over Time
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v)=> `$${v}`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        formatter={(value: any) => [`$${value}/mo`, 'Cumulative Savings']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#22c55e" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: 'var(--card)' }}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#22c55e' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 text-center bg-green-500/5 p-4 rounded-xl border border-green-500/10">
                   <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-1">Total Impact</p>
                   <p className="text-3xl font-extrabold text-foreground">${history.totalSavingsAchieved}/<span className="text-lg text-muted-foreground">mo</span></p>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
