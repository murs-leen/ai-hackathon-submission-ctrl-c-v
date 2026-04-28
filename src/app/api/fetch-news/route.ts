import { NextResponse } from 'next/server';
import { fallbackNews } from '@/lib/fallback-news';

export async function GET() {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!apiKey || !engineId) {
    console.log("No Custom Search API configured. Utilizing fallback news data.");
    return NextResponse.json({ news: fallbackNews });
  }

  try {
    const query = "AI model pricing OR cloud API deprecation OR developer tool framework updates";
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(query)}&num=10&dateRestrict=m1`
    );
    
    if (!res.ok) {
        throw new Error("Search API failed");
    }

    const data = await res.json();
    
    const news = data.items && data.items.length > 0 ? data.items.map((item: any, idx: number) => ({
      id: `live-${idx}`,
      title: item.title,
      description: item.snippet,
      source: item.displayLink || "Tech News",
      url: item.link,
      publishedAt: new Date().toISOString()
    })) : fallbackNews;

    return NextResponse.json({ news });
  } catch (err) {
    console.error("News fetch error:", err);
    return NextResponse.json({ news: fallbackNews });
  }
}
