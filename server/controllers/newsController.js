import { getCachedNews } from "../services/news.js";

export function getNews(req, res){
    const news = getCachedNews();
    res.json({ news });
}