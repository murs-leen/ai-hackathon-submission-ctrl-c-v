"use client";

import { useAuth } from "@/contexts/auth-context";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Bell, Database, Download, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [relevanceScore, setRelevanceScore] = useState([70]);

  return (
    
      <div className="container mx-auto px-4 py-12 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Account Preferences</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your cloud identity, alerts, and operational data.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-4 space-y-6">
            <Card className="border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-4">
                 <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden mb-4 border border-border/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User /></div>}
                 </div>
                 <CardTitle className="text-xl">{user?.displayName || "Unknown User"}</CardTitle>
                 <CardDescription className="text-xs truncate">{user?.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Badge variant="secondary" className="w-full justify-center bg-green-500/10 text-green-500 font-bold border-green-500/20 py-1.5 uppercase tracking-widest text-[10px]">Active Member</Badge>
                 <Button variant="outline" onClick={signOut} className="w-full font-semibold border-border">Sign Out of Vault</Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-8 space-y-6">
            
            <Card className="border-border/50 bg-card shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-lg" />
              <CardHeader>
                <div className="flex items-center gap-3">
                   <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><Bell size={20} /></div>
                   <CardTitle className="text-lg">Alert Thresholds</CardTitle>
                </div>
                <CardDescription>Calibrate how sensitive Stack Sentinel is to news relevancy scoring.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                     <span>Minimum Match Score</span>
                     <Badge variant="outline" className="text-blue-400 border-blue-500/30">{relevanceScore}% Match</Badge>
                  </div>
                  <Slider defaultValue={relevanceScore} max={100} step={1} onValueChange={(v) => setRelevanceScore(v as number[])} className="cursor-pointer" />
                  <p className="text-xs text-muted-foreground">Only surface AI intelligence analysis with a confidence rating exceeding {relevanceScore}%. Lowering this yields more noise.</p>
                </div>
                <div className="space-y-4">
                   <h4 className="text-sm font-semibold">Priority Interception Vectors</h4>
                   <div className="space-y-3">
                      {[ 
                        { id: 'pricing', label: "Pricing Increases & Packaging" },
                        { id: 'deprecation', label: "Feature Deprecations" },
                        { id: 'alternative', label: "New Tech Alternatives" },
                        { id: 'general', label: "General Updates (Not Cost Impacting)" }
                      ].map(box => (
                        <div key={box.id} className="flex items-center space-x-3">
                          <Checkbox id={box.id} defaultChecked={box.id !== 'general'} />
                          <label htmlFor={box.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{box.label}</label>
                        </div>
                      ))}
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80 rounded-l-lg" />
              <CardHeader>
                 <div className="flex items-center gap-3">
                   <div className="bg-red-500/10 p-2 rounded-lg text-red-500"><Database size={20} /></div>
                   <CardTitle className="text-lg text-foreground">Data Operations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border border-border/50 bg-secondary/20 rounded-xl">
                   <div>
                      <p className="text-sm font-semibold flex items-center gap-2"><Download size={14}/> Export Intelligence</p>
                      <p className="text-xs text-muted-foreground mt-1">Download your stack, history, and simulation reports as JSON.</p>
                   </div>
                   <Button variant="outline" className="shadow-sm">Export Data</Button>
                 </div>
                 
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
                   <div>
                      <p className="text-sm font-semibold text-red-500 flex items-center gap-2"><AlertTriangle size={14}/> Delete Database</p>
                      <p className="text-xs text-muted-foreground mt-1">Permanently destroy all cloud Firestore tracks associated with your UID.</p>
                   </div>
                   <Button variant="destructive" className="shadow-sm font-bold bg-red-600">Shred Data</Button>
                 </div>
              </CardContent>
            </Card>
            
          </div>
        </div>
      </div>
    
  );
}
