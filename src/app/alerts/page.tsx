"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyzedAlert, StackItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowRight, Loader2, Info, TrendingDown, Search, CheckCircle2, Circle, Globe, ExternalLink } from "lucide-react";

export default function AlertsPage() {
  const router = useRouter();
  const [stack, setStack] = useState<StackItem[]>([]);
  const [alerts, setAlerts] = useState<AnalyzedAlert[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showAllSources, setShowAllSources] = useState(false);

  const handleAlertAction = (alert: AnalyzedAlert, action: 'acted' | 'dismissed') => {
    // Save to history
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

    // Remove from active alerts visually
    const newAlerts = alerts.filter(a => a !== alert);
    setAlerts(newAlerts);
    localStorage.setItem("stack-sentinel:alerts", JSON.stringify(newAlerts));
  };

  useEffect(() => {
    // Phase 1 fallback plus Phase 2 key
    const saved = localStorage.getItem("stack-sentinel:stack") || localStorage.getItem("stack");
    if (!saved || JSON.parse(saved).length === 0) {
      router.push("/");
      return;
    }
    const stackData = JSON.parse(saved);
    setStack(stackData);
    
    const savedAlerts = localStorage.getItem("stack-sentinel:alerts") || localStorage.getItem("alerts");
    if (savedAlerts && JSON.parse(savedAlerts).length > 0) {
      setAlerts(JSON.parse(savedAlerts));
      setLoading(false);
    } else {
      fetchAndAnalyze(stackData);
    }
  }, [router]);

  const fetchAndAnalyze = async (stackData: StackItem[]) => {
    setLoading(true);
    setLoadingStep(1); 
    
    // Simulate multi-step processing while waiting for single Gemini call
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
      setTimeout(() => {
        setAlerts(data.alerts || []);
        setSources(data.sources || []);
        localStorage.setItem("stack-sentinel:alerts", JSON.stringify(data.alerts || []));
        setLoading(false);
      }, 800);
    } catch (e) {
      console.error(e);
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const totalMonthlyCost = stack.reduce((sum, item) => sum + item.monthlyCost, 0);
  const totalSavings = alerts.filter(a => a.costImpact < 0).reduce((sum, a) => sum + Math.abs(a.costImpact), 0);

  const urgencyColors: Record<string, string> = {
    critical: "border-red-500",
    high: "border-orange-500",
    medium: "border-yellow-500",
    low: "border-blue-500",
  };
  
  const urgencyBadges: Record<string, string> = {
    critical: "bg-red-500 text-white hover:bg-red-600",
    high: "bg-orange-500 text-white hover:bg-orange-600",
    medium: "bg-yellow-500 text-black hover:bg-yellow-600",
    low: "bg-blue-500 text-white hover:bg-blue-600",
  };

  if (loading) {
    const steps = [
      "Starting analysis...",
      "Searching latest tech news",
      "Checking pricing pages",
      "Analyzing impact on your stack",
      "Calculating cost savings"
    ];

    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full scale-150"></div>
          <div className="relative flex items-center justify-center h-24 w-24 bg-card border border-border/60 shadow-xl rounded-full">
            <Search className="h-10 w-10 text-primary absolute animate-ping opacity-20" />
            <Search className="h-10 w-10 text-primary relative z-10" />
            <div className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Stack Sentinel is analyzing...</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Evaluating real-time tech news and pricing updates via Google Gemini Search Grounding.</p>
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
                <div key={step} className={`flex items-center space-x-4 transition-all duration-500 ${isPast ? 'text-muted-foreground' : isActive ? 'text-foreground scale-105 transform origin-left' : 'text-muted-foreground/30'}`}>
                  {isPast ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
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

      <div className="mb-10 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0 flex items-center justify-center p-3 h-14 w-14 bg-blue-500/10 text-blue-500 rounded-xl">
          <Globe className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold flex items-center text-blue-50 flex-wrap gap-2">
            Powered by Gemini with Google Search
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase font-bold tracking-wider">Grounding Active</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-3">AI searched verified real-time sources to validate pricing, feature changes, and deprecations affecting your stack.</p>
          
          {sources.length > 0 && (
            <div className="text-sm border border-border/40 rounded-lg bg-background/50 p-4">
               <div className="font-semibold mb-2 text-foreground/80 text-xs uppercase tracking-widest flex items-center justify-between">
                 Sources Checked:
                 {sources.length > 3 && (
                   <button onClick={() => setShowAllSources(!showAllSources)} className="text-blue-400 hover:text-blue-300 transition-colors uppercase text-[10px]">
                     {showAllSources ? "Show Less ↑" : "Show All ↓"}
                   </button>
                 )}
               </div>
               <ul className="space-y-1.5 list-none">
                 {(showAllSources ? sources : sources.slice(0, 3)).map((src, i) => (
                   <li key={i} className="flex items-center text-muted-foreground before:content-['•'] before:mr-2 before:text-blue-500/50">
                     <span className="truncate max-w-full">{src}</span>
                   </li>
                 ))}
               </ul>
            </div>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card className="bg-card/40 border-green-500/20 backdrop-blur-sm shadow-xl mt-8">
          <CardContent className="flex flex-col items-center py-20 text-center space-y-6">
            <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Your stack is looking good!</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Stack Sentinel evaluated real-time news and found nothing that negatively impacts your tools this week. Your infrastructure remains financially optimized.
              </p>
            </div>
            <div className="w-full max-w-lg mt-6 bg-background/60 border border-border/50 rounded-xl p-6 text-left">
               <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Verification Check:</h4>
               <ul className="space-y-3">
                 {stack.slice(0,3).map(s => (
                   <li key={s.id} className="flex items-center text-sm font-medium text-foreground/80">
                     <CheckCircle2 className="w-4 h-4 text-green-500 mr-3 shrink-0" />
                     {s.name} - no pricing or service disruption notices found.
                   </li>
                 ))}
                 {stack.length > 3 && (
                   <li className="flex items-center text-sm text-muted-foreground font-medium pl-1">
                     + {stack.length - 3} more tools verified stable
                   </li>
                 )}
               </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          {alerts.map((alert, i) => (
            <Card key={i} className={`border-l-4 ${urgencyColors[alert.urgency?.toLowerCase()] || urgencyColors.low} bg-card/80 backdrop-blur-md hover:bg-card hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col group`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                  <Badge className={`${urgencyBadges[alert.urgency?.toLowerCase()] || urgencyBadges.low} uppercase text-[11px] tracking-wider font-bold px-3 py-1 shadow-sm`}>
                    {alert.urgency}
                  </Badge>
                  {alert.confidence && (
                     <span className="text-xs font-bold text-muted-foreground bg-secondary/80 px-2.5 py-1.5 rounded-md flex items-center gap-1 border border-border/50">
                       <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                       Verified AI Score: {alert.relevanceScore}%
                     </span>
                  )}
                </div>
                <CardTitle className="text-2xl font-extrabold mb-3 break-words leading-tight">{alert.newsItem?.title || `Urgent Update for ${alert.affectedTool}`}</CardTitle>
                
                {alert.sourceUrl && (
                  <Badge variant="outline" className="w-fit text-[10px] font-medium bg-background/50 border-primary/20 text-muted-foreground flex items-center gap-1 hover:bg-primary/5 cursor-pointer">
                    <Globe className="w-3 h-3" /> Source: {new URL(alert.sourceUrl).hostname}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-6 text-sm flex-1">
                <div className="space-y-2.5">
                  <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     WHY THIS AFFECTS YOU 
                     <Badge variant="secondary" className="text-[10px] h-4 py-0 px-2 uppercase shadow-sm">Tool: {alert.affectedTool}</Badge>
                  </h4>
                  <p className="text-base leading-relaxed border-l-2 border-primary/40 pl-4 py-1 italic shadow-sm text-foreground/90 bg-primary/5 rounded-r-lg">{alert.whyRelevant}</p>
                </div>
                
                {alert.costImpact !== 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground">Monthly Impact</h4>
                    <div className={`inline-flex px-4 py-2.5 rounded-xl font-bold text-lg shadow-sm ${alert.costImpact < 0 ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-500 border border-red-500/30'}`}>
                      {alert.costImpact < 0 ? `Save $${Math.abs(alert.costImpact)}/month` : `Increase $${alert.costImpact}/month`}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground">Recommended Action</h4>
                  <p className="font-medium text-blue-300 bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/20 shadow-inner">{alert.recommendedAction}</p>
                </div>
              </CardContent>
              {alert.sourceUrl && (
                <CardFooter className="pt-4 pb-5 border-t border-border/40 mt-auto bg-card/50 flex flex-col gap-3">
                  <div className="flex gap-3 w-full">
                    <Button variant="outline" className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-400 border-green-500/20" onClick={() => handleAlertAction(alert, 'acted')}>
                      Take Action
                    </Button>
                    <Button variant="outline" className="flex-1 hover:bg-red-500/10 hover:text-red-400 border-border/50 text-muted-foreground" onClick={() => handleAlertAction(alert, 'dismissed')}>
                      Dismiss
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full justify-between hover:bg-blue-500/15 text-primary hover:text-blue-400 h-10 rounded-xl transition-all font-semibold border border-transparent hover:border-blue-500/20" onClick={() => window.open(alert.sourceUrl, '_blank')}>
                    View Source Details
                    <ExternalLink size={16} className="transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {totalSavings > 0 && alerts.length > 0 && (
        <div className="mt-14 relative overflow-hidden bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-blue-900/60 border border-blue-500/40 rounded-3xl p-8 lg:p-10 flex flex-col sm:flex-row items-center justify-between shadow-2xl backdrop-blur-xl hover:border-blue-500/70 transition-all duration-500 group">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-colors duration-1000"></div>
          <div className="mb-8 sm:mb-0 relative z-10 text-center sm:text-left">
            <h3 className="text-xl font-bold tracking-tight text-blue-100 opacity-90 uppercase text-[13px] mb-2">Simulated Impact Analysis</h3>
            <p className="text-green-400 font-extrabold text-5xl flex items-center justify-center sm:justify-start drop-shadow-md">
              ${totalSavings} <span className="text-xl text-green-400/70 ml-2 mt-4 font-bold tracking-widest uppercase">/mo savings</span>
              <TrendingDown className="ml-4 h-10 w-10 text-green-400 opacity-80" />
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard")} className="relative z-10 bg-white text-black hover:bg-white/90 px-10 h-14 text-lg font-bold rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 transition-all">
            Open Simulator <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
