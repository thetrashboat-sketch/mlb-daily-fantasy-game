import { XMLParser } from 'fast-xml-parser';
const NEWS_FEED_URL = 'https://www.mlb.com/feeds/news/rss.xml';
const MAX_ITEMS = 8;

const parser = new XMLParser({ ignoreAttributes: false })

let cachedNews = { items: [], lastFetchedAt: null }

export async function refreshNews() {
    try{
        const res = await fetch(NEWS_FEED_URL);

        if (!res.ok) {
            throw new Error(`News fetch failed: ${res.status}`);
        }

        const xml = await res.text();
        const parsed = parser.parse(xml);

        const rawItems = parsed.rss.channel.item;
        const itemList = Array.isArray(rawItems) ? rawItems : [rawItems];

        const items = itemList
            .slice(0, MAX_ITEMS)
            .map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            image: item.image?.['@_href'] ?? null,
        }));

        cachedNews = {
            items,
            lastFetchedAt: new Date().toISOString(),
        };


    } catch(err){
        console.error('Failed to refresh news:', err.message);
    }
}

export function getCachedNews() {
  return cachedNews;
}