"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyzedAlert, StackItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowRight, Loader2, Search, CheckCircle2, Circle, Globe, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getUserStacks } from "@/lib/firestore/stacks";
import { saveAlerts, getPendingAlerts, markAlertActed, dismissAlert } from "@/lib/firestore/alerts";


export default function AlertsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [stack, setStack] = useState<StackItem[]>([]);
  const [alerts, setAlerts] = useState<AnalyzedAlert[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    const loadContext = async () => {
      let stackData: StackItem[] = [];
      let pending: AnalyzedAlert[] = [];

      try {
        if (user) {
          stackData = await getUserStacks(user.uid);
          if (stackData.length === 0) {
             router.push("/");
             return;
          }
          setStack(stackData);
          pending = await getPendingAlerts(user.uid);
        } else {
          const saved = localStorage.getItem("stack-sentinel:stack") || localStorage.getItem("stack");
          if (!saved || JSON.parse(saved).length === 0) {
            router.push("/");
            return;
          }
          stackData = JSON.parse(saved);
          setStack(stackData);

          const savedAlerts = localStorage.getItem("stack-sentinel:alerts");
          if (savedAlerts && JSON.parse(savedAlerts).length > 0) {
             pending = JSON.parse(savedAlerts);
          }
        }

        if (pending.length > 0) {
          setAlerts(pending);
          setLoading(false);
        } else {
          fetchAndAnalyze(stackData);
        }
      } catch (e) {
        console.error("Alerts fetching error:", e);
        setLoading(false);
      }
    };

    loadContext();
  }, [user, authLoading, router]);

  const fetchAndAnalyze = async (stackData: StackItem[]) => {
    setLoading(true);
    setLoadingStep(1); 
    
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => prev < 3 ? prev + 1 : prev);
    }, 2500);

    try {
      const analyzeRes = await fetch("/api/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stack: stackData })
      });
      const data = await analyzeRes.json();
      
      clearInterval(stepInterval);
      setLoadingStep(4);
      
      if (user) await saveAlerts(user.uid, data.alerts || []);
      else localStorage.setItem("stack-sentinel:alerts", JSON.stringify(data.alerts || []));
      
      setTimeout(async () => {
        if (user) {
           const reloadedPending = await getPendingAlerts(user.uid);
           setAlerts(reloadedPending);
        } else {
           setAlerts(data.alerts || []);
        }
        setSources(data.sources || []);
        setLoading(false);
      }, 800);
    } catch (e) {
      console.error(e);
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleAlertAction = async (alert: AnalyzedAlert, action: 'acted' | 'dismissed') => {
    if (user && alert.dbId) {
      if (action === 'acted') {
         await markAlertActed(user.uid, alert.dbId, alert.costImpact < 0 ? Math.abs(alert.costImpact) : 0);
      } else {
         await dismissAlert(user.uid, alert.dbId);
      }
      setAlerts(prev => prev.filter(a => a.dbId !== alert.dbId));
    } else {
      // Local fallback
      const saved = localStorage.getItem("stack-sentinel:history");
      const history = saved ? JSON.parse(saved) : { items: [], totalSavingsAchieved: 0, totalAlertsActedOn: 0 };
      
      const newItem = {
        id: Math.random().toString(36).substr(2, 9),
        alert,
        status: action,
        actedAt: action === 'acted' ? new Date().toISOString() : undefined,
        dismissedAt: action === 'dismissed' ? new Date().toISOString() : undefined,
        savingsAchieved: action === 'acted' && alert.costImpact < 0 ? Math.abs(alert.costImpact) : 0,
        dismissReason: action === 'dismissed' ? "Not relevant right now" : undefined
      };
      
      history.items.push(newItem);
      if (action === 'acted') {
        history.totalAlertsActedOn += 1;
        if (alert.costImpact < 0) history.totalSavingsAchieved += Math.abs(alert.costImpact);
      }
      
      localStorage.setItem("stack-sentinel:history", JSON.stringify(history));
      const newAlerts = alerts.filter(a => a !== alert);
      setAlerts(newAlerts);
      localStorage.setItem("stack-sentinel:alerts", JSON.stringify(newAlerts));
    }
  };

  const totalMonthlyCost = stack.reduce((sum, item) => sum + item.monthlyCost, 0);

  if (loading || authLoading) {
    const steps = [ "Starting analysis...", "Searching latest tech news", "Checking pricing pages", "Analyzing impact on your stack", "Calculating cost savings" ];
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full scale-150"></div>
            <div className="relative flex items-center justify-center h-24 w-24 bg-card border border-border/60 shadow-xl rounded-full">
              <Search className="h-10 w-10 text-primary absolute animate-ping opacity-20" />
              <Search className="h-10 w-10 text-primary relative z-10" />
            </div>
          </div>
          <div className="w-full max-w-md bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 p-6 shadow-xl relative overflow-hidden">
             <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full">
               <div className="h-full bg-primary transition-all duration-1000 ease-in-out" style={{ width: `${(loadingStep / 4) * 100}%` }} />
             </div>
             <div className="flex flex-col space-y-4">
               {[1, 2, 3, 4].map((step) => {
                 const isActive = loadingStep === step;
                 const isPast = loadingStep > step;
                 return (
                   <div key={step} className={`flex items-center space-x-4 transition-all duration-500 ${isPast ? 'text-muted-foreground' : isActive ? 'text-foreground scale-105' : 'text-muted-foreground/30'}`}>
                     {isPast ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : isActive ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Circle className="w-5 h-5" />}
                     <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>Step {step}: {steps[step]}</span>
                   </div>
                 )
               })}
             </div>
          </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Your Stack Alerts</h1>
            <p className="text-lg text-muted-foreground mt-1">Real-time Grounded intelligence matching your tools.</p>
          </div>
          <Button onClick={() => fetchAndAnalyze(stack)} variant="outline" className="gap-2 h-11 px-6 shadow-sm">
            <RefreshCw size={18} /> Refresh Analysis
          </Button>
        </div>

        <div className="mb-6 w-full overflow-x-auto pb-4 hide-scrollbar">
          <div className="flex items-center space-x-3 min-w-max">
            <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mr-2">Monitoring:</span>
            {stack.map((item) => (
              <Badge key={item.id} variant="secondary" className="px-4 py-1.5 text-sm bg-card border-border/60 shadow-sm">
                {item.name} <span className="ml-2 text-muted-foreground font-medium">${item.monthlyCost}</span>
              </Badge>
            ))}
            <Badge variant="outline" className="ml-2 px-4 py-1.5 text-sm font-bold border-blue-500/50 text-blue-400 bg-blue-500/10">
              Total Stack: ${totalMonthlyCost}/mo
            </Badge>
          </div>
        </div>

        {alerts.length === 0 ? (
          <Card className="bg-card/40 border-green-500/20 backdrop-blur-sm shadow-xl mt-8">
            <CardContent className="flex flex-col items-center py-20 text-center space-y-6">
              <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Your stack is looking good!</h2>
              <p className="text-lg text-muted-foreground max-w-xl">Stack Sentinel evaluated real-time news and found nothing that negatively impacts your tools this week.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {alerts.map((alert, i) => (
              <Card key={i} className="bg-card/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col border-l-4 border-blue-500 group">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-blue-500 uppercase text-[11px] font-bold px-3 py-1">{alert.urgency}</Badge>
                     <span className="text-xs font-bold text-muted-foreground bg-secondary/80 px-2.5 py-1.5 rounded-md flex items-center gap-1 border border-border/50">
                       <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Score: {alert.relevanceScore}%
                     </span>
                  </div>
                  <CardTitle className="text-2xl font-extrabold mb-3 leading-tight">{alert.newsItem?.title || `Update for ${alert.affectedTool}`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm flex-1">
                  <p className="text-base leading-relaxed border-l-2 border-primary/40 pl-4 py-1 italic shadow-sm text-foreground/90 bg-primary/5 rounded-r-lg">{alert.whyRelevant}</p>
                  
                  {alert.costImpact !== 0 && (
                    <div>
                      <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Monthly Impact</h4>
                      <div className={`inline-flex px-4 py-2.5 rounded-xl font-bold text-lg shadow-sm ${alert.costImpact < 0 ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-500 border border-red-500/30'}`}>
                        {alert.costImpact < 0 ? `Save $${Math.abs(alert.costImpact)}/month` : `Increase $${alert.costImpact}/month`}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground">Action</h4>
                    <p className="font-medium text-blue-300 bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/20">{alert.recommendedAction}</p>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 pb-5 border-t border-border/40 mt-auto bg-card/50 flex flex-col gap-3">
                  <div className="flex gap-3 w-full">
                    <Button variant="outline" className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20" onClick={() => handleAlertAction(alert, 'acted')}>Act</Button>
                    <Button variant="outline" className="flex-1 hover:bg-red-500/10 hover:text-red-400" onClick={() => handleAlertAction(alert, 'dismissed')}>Dismiss</Button>
                  </div>
                  {alert.sourceUrl && (
                    <Button variant="ghost" className="w-full text-primary hover:text-blue-400" onClick={() => window.open(alert.sourceUrl, '_blank')}>View Source <ExternalLink size={16} className="ml-2" /></Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
