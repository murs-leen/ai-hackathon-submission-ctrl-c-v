"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LogOut, Archive, Filter, CheckCircle2, X } from "lucide-react";
import { AlertHistoryItem, AlertHistory } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { getAlertHistory, getTotalSavings } from "@/lib/firestore/alerts";


export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [items, setItems] = useState<AlertHistoryItem[]>([]);
  const [savings, setSavings] = useState(0);
  const [actedCount, setActedCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'acted' | 'dismissed'>('all');

  useEffect(() => {
    if (authLoading) return;
    const loadLogs = async () => {
       if (user) {
          const logs = await getAlertHistory(user.uid);
          setItems(logs);
          setSavings(await getTotalSavings(user.uid));
          setActedCount(logs.filter(l => l.status === 'acted').length);
       } else {
          const s = localStorage.getItem("stack-sentinel:history");
          if (s) {
            const h: AlertHistory = JSON.parse(s);
            setItems(h.items);
            setSavings(h.totalSavingsAchieved);
            setActedCount(h.totalAlertsActedOn);
          }
       }
    };
    loadLogs();
  }, [user, authLoading]);

  const filteredItems = items.filter(item => filter === 'all' ? true : item.status === filter);

  // Parse chronological data for Recharts (Cumulative savings over time, simplistic)
  let cumulative = 0;
  const chartData = [...items].reverse().reduce((acc, item) => {
    if (item.status === 'acted' && item.savingsAchieved && item.savingsAchieved > 0) {
      cumulative += item.savingsAchieved;
      // Truncating dates securely preventing TS format bugs
      const displayDate = item.actedAt ? String(item.actedAt).substring(0, 10) : 'Date';
      acc.push({ date: displayDate, savings: cumulative });
    }
    return acc;
  }, [] as any[]);

  return (
    
      <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight">Audit Log & Savings</h1>
          <p className="text-muted-foreground mt-2">Historical archive of architecture actions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <Card className="bg-card/60 backdrop-blur-sm border-blue-500/20 col-span-1 md:col-span-2 shadow-lg">
             <CardHeader className="pb-2">
               <CardDescription className="uppercase tracking-wider font-bold text-[10px]">Realized Optimizations</CardDescription>
               <CardTitle className="text-5xl font-black text-green-500">${savings}<span className="text-xl text-muted-foreground ml-2">/mo</span></CardTitle>
             </CardHeader>
           </Card>
           <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-lg">
             <CardHeader className="pb-2">
               <CardDescription className="uppercase tracking-wider font-bold text-[10px]">Alerts Processed</CardDescription>
               <CardTitle className="text-4xl font-black">{items.length}</CardTitle>
             </CardHeader>
           </Card>
           <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-lg">
             <CardHeader className="pb-2">
               <CardDescription className="uppercase tracking-wider font-bold text-[10px]">Actions Executed</CardDescription>
               <CardTitle className="text-4xl font-black text-blue-500">{actedCount}</CardTitle>
             </CardHeader>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
           <Card className="lg:col-span-7 border-border/50 bg-card/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="text-lg">Cumulative ROI Trend</CardTitle>
                 </div>
                 <Badge variant="outline" className="text-[10px] tracking-wide">Beta</Badge>
              </CardHeader>
              <CardContent className="h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgb(2, 6, 23)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl">No optimization events tracked yet.</div>
                )}
              </CardContent>
           </Card>

           <Card className="lg:col-span-5 border-border/50 bg-card/50 shadow-lg overflow-hidden flex flex-col">
              <div className="bg-secondary/40 p-3 border-b border-border/40 flex items-center justify-between">
                 <div className="flex gap-2">
                   <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>All</button>
                   <button onClick={() => setFilter('acted')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'acted' ? 'bg-green-500/20 text-green-500' : 'text-muted-foreground hover:bg-secondary'}`}>Acted</button>
                   <button onClick={() => setFilter('dismissed')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'dismissed' ? 'bg-red-500/10 text-red-400' : 'text-muted-foreground hover:bg-secondary'}`}>Dismissed</button>
                 </div>
                 <Filter size={16} className="text-muted-foreground" />
              </div>
              <div className="flex-1 overflow-y-auto max-h-[400px] p-0 custom-scrollbar">
                {filteredItems.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {filteredItems.map(item => (
                      <div key={item.id} className="p-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm flex items-center gap-1 ${item.status === 'acted' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                             {item.status === 'acted' ? <CheckCircle2 size={10}/> : <X size={10}/>} {item.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{String(item.actedAt || item.dismissedAt).substring(0, 10)}</span>
                        </div>
                        <h4 className="font-bold text-sm mb-1">{item.alert.newsItem?.title || "Urgent Update"}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.alert.whyRelevant}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 text-center opacity-70">
                     <Archive size={32} className="mb-3 text-muted-foreground" />
                     <p className="text-sm">No alert records match this filter.</p>
                  </div>
                )}
              </div>
           </Card>
        </div>
      </div>
    
  );
}
