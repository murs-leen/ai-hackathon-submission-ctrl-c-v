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
  newsItem: NewsItem;
  isRelevant: boolean;
  relevanceScore: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  whyRelevant: string;
  costImpact: number; // negative = savings
  recommendedAction: string;
  affectedTool: string; // which tool from stack this affects
}

export interface DashboardData {
  stack: StackItem[];
  alerts: AnalyzedAlert[];
  totalMonthlyCost: number;
  potentialSavings: number;
  bankBalance: number;
}
