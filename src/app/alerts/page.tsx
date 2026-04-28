"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyzedAlert, StackItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowRight, Loader2, Info, TrendingDown } from "lucide-react";

export default function AlertsPage() {
  const router = useRouter();
  const [stack, setStack] = useState<StackItem[]>([]);
  const [alerts, setAlerts] = useState<AnalyzedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("stack");
    if (!saved || JSON.parse(saved).length === 0) {
      router.push("/");
      return;
    }
    const stackData = JSON.parse(saved);
    setStack(stackData);
    
    // Check if we have cached alerts to show immediately, but refetch to show dynamic analysis
    const savedAlerts = localStorage.getItem("alerts");
    if (savedAlerts && JSON.parse(savedAlerts).length > 0) {
      setAlerts(JSON.parse(savedAlerts));
      setLoading(false);
    } else {
      fetchAndAnalyze(stackData);
    }
  }, []);

  const fetchAndAnalyze = async (stackData: StackItem[]) => {
    setLoading(true);
    setLoadingStep(1); // Fetching news
    try {
      const newsRes = await fetch("/api/fetch-news");
      const { news } = await newsRes.json();
      
      setLoadingStep(2); // Analyzing with Gemini
      const analyzeRes = await fetch("/api/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stack: stackData, newsItems: news })
      });
      const { alerts } = await analyzeRes.json();
      
      setAlerts(alerts || []);
      localStorage.setItem("alerts", JSON.stringify(alerts || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalMonthlyCost = stack.reduce((sum, item) => sum + item.monthlyCost, 0);

  const totalSavings = alerts
    .filter(a => a.costImpact < 0)
    .reduce((sum, a) => sum + Math.abs(a.costImpact), 0);

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
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
          <Loader2 className="h-16 w-16 animate-spin text-blue-500 relative z-10" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Watching Your Stack...</h2>
        <div className="flex flex-col space-y-3 text-muted-foreground w-80">
          <div className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${loadingStep >= 1 ? "bg-secondary/80 text-foreground" : "bg-card border border-border"}`}>
            <div className={`w-3 h-3 rounded-full ${loadingStep >= 1 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-muted"}`} />
            <span className="font-medium">Fetching latest tech news...</span>
          </div>
          <div className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${loadingStep >= 2 ? "bg-secondary/80 text-foreground" : "bg-card border border-border"}`}>
            <div className={`w-3 h-3 rounded-full ${loadingStep >= 2 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-muted"}`} />
            <span className="font-medium">Analyzing with Gemini AI...</span>
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
          <p className="text-lg text-muted-foreground mt-1">AI-filtered news matching your tools.</p>
        </div>
        <Button onClick={() => fetchAndAnalyze(stack)} variant="outline" className="gap-2 h-11 px-6 shadow-sm">
          <RefreshCw size={18} /> Refresh Analysis
        </Button>
      </div>

      <div className="mb-10 w-full overflow-x-auto pb-4 hide-scrollbar">
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
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm shadow-xl">
          <CardContent className="flex flex-col items-center py-20 text-center space-y-5">
            <div className="h-20 w-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-2">
              <Info size={40} />
            </div>
            <h2 className="text-3xl font-bold">Your stack is stable!</h2>
            <p className="text-lg text-muted-foreground max-w-lg">
              We found no critical alerts or pricing changes affecting your tools today. Check back later or add more tools.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 relative">
          {alerts.map((alert, i) => (
            <Card key={i} className={`border-l-4 ${urgencyColors[alert.urgency?.toLowerCase()] || urgencyColors.low} bg-card/80 backdrop-blur-md hover:bg-card hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-3">
                  <Badge className={`${urgencyBadges[alert.urgency?.toLowerCase()] || urgencyBadges.low} uppercase text-[11px] tracking-wider font-bold px-3 py-1`}>
                    {alert.urgency}
                  </Badge>
                  <span className="text-xs font-bold text-muted-foreground bg-secondary/80 px-2.5 py-1.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Relevance: {alert.relevanceScore}%
                  </span>
                </div>
                <CardTitle className="text-xl leading-snug lg:text-2xl font-bold mb-2 break-words text-balance">{alert.newsItem?.title || "Alert"}</CardTitle>
                <CardDescription className="text-xs font-medium flex items-center space-x-2">
                  <span className="text-foreground/70">{alert.newsItem?.source || "Tech News"}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{alert.newsItem?.publishedAt ? new Date(alert.newsItem.publishedAt).toLocaleDateString() : ""}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm flex-1">
                <div className="space-y-2 flex flex-col">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                     Why this affects you 
                     <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5">Tool: {alert.affectedTool}</Badge>
                  </h4>
                  <p className="leading-relaxed border-l-2 border-primary/50 pl-4 py-1 italic text-foreground/90 bg-muted/20 rounded-r-md">{alert.whyRelevant}</p>
                </div>
                
                {alert.costImpact !== 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Impact</h4>
                    <div className={`inline-flex px-4 py-2 rounded-lg font-bold text-base shadow-sm ${alert.costImpact < 0 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {alert.costImpact < 0 ? `Save $${Math.abs(alert.costImpact)}/month` : `Increase $${alert.costImpact}/month`}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Recommended Action</h4>
                  <p className="font-medium text-blue-400 bg-blue-500/5 p-3 rounded-md border border-blue-500/10">{alert.recommendedAction}</p>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border/40 mt-auto">
                <Button variant="ghost" className="w-full justify-between hover:bg-blue-500/10 hover:text-blue-400 group h-12" onClick={() => window.open(alert.newsItem?.url, '_blank')}>
                  <span className="font-semibold">Read Original Article</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {totalSavings > 0 && (
        <div className="mt-12 relative overflow-hidden bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-blue-900/40 border border-blue-500/30 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between shadow-2xl backdrop-blur-md hover:border-blue-500/60 transition-colors">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="mb-6 sm:mb-0 relative z-10 text-center sm:text-left">
            <h3 className="text-xl font-bold tracking-tight text-blue-100">Potential Monthly Savings</h3>
            <p className="text-green-400 font-extrabold text-4xl mt-2 flex items-center justify-center sm:justify-start">
              ${totalSavings}
              <TrendingDown className="ml-3 h-8 w-8" />
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard")} className="relative z-10 bg-white text-black hover:bg-gray-200 px-8 h-14 text-lg font-bold rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-105 transition-all">
            Open Cost Dashboard <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
      
      {totalSavings <= 0 && alerts.length > 0 && (
         <div className="mt-10 flex justify-center">
             <Button onClick={() => router.push("/dashboard")} variant="secondary" className="px-8 h-12 text-md font-semibold">
                Open Cost Dashboard <ArrowRight className="ml-2 w-4 h-4" />
             </Button>
         </div>
      )}
    </div>
  );
}
