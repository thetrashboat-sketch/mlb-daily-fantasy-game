import { getTodaysSlateCount } from '../services/slate.js';

export async function getSlate(req, res){
    try{
        const count = await getTodaysSlateCount();
        res.json({ slate: count});
    } catch(err){
        console.error('Failed to get slate count:', err.message);
        res.status(500).json({ slate: { count: null } });
    }
}