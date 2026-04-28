export interface StackItem {
  id: string;
  name: string;
  category: 'ai-ml' | 'database' | 'hosting' | 'auth' | 'payment' | 'analytics' | 'other';
  monthlyCost: number;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface AnalyzedAlert {
  newsItem?: NewsItem;
  isRelevant: boolean;
  relevanceScore: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  whyRelevant: string;
  costImpact: number; // negative = savings
  recommendedAction: string;
  affectedTool: string; // which tool from stack this affects
  sourceUrl?: string;
  confidence?: number;
}

export interface DashboardData {
  stack: StackItem[];
  alerts: AnalyzedAlert[];
  totalMonthlyCost: number;
  potentialSavings: number;
  bankBalance: number;
}

export interface AlertHistoryItem {
  id: string;
  alert: AnalyzedAlert;
  status: 'pending' | 'acted' | 'dismissed';
  actedAt?: string;
  dismissedAt?: string;
  dismissReason?: string;
  savingsAchieved?: number; // Only if acted
  notes?: string;
}

export interface AlertHistory {
  items: AlertHistoryItem[];
  totalSavingsAchieved: number;
  totalAlertsActedOn: number;
}

export interface SavedScenario {
  id: string;
  currentToolName: string;
  replacementToolName: string;
  estimatedNewCost: number;
  monthlySavings: number;
  migrationComplexity: 'low' | 'medium' | 'high';
  featureComparison: string;
  recommendation: string;
  caveats: string[];
}
