// api/user/downloads.ts
// GET /api/user/downloads?sessionId=xxx
// Return download history untuk user

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') { 
    res.status(200).end(); 
    return; 
  }

  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    // 1. Validate session
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // 2. Get download history
    const { data: histData } = await supabaseAdmin
      .from('download_history')
      .select('mod_id, created_at')
      .eq('discord_id', session.discord_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!histData || histData.length === 0) {
      return res.status(200).json([]);
    }

    // 3. Get mod details
    const modIds = histData.map(h => h.mod_id).filter(Boolean);
    const { data: modsData } = await supabaseAdmin
      .from('mods')
      .select('id, title, category, created_at')
      .in('id', modIds);

    if (!modsData) {
      return res.status(200).json([]);
    }

    // 4. Map and sort
    const modsMap = new Map(modsData.map(m => [m.id, m]));
    const result = modIds
      .map(id => modsMap.get(id))
      .filter(Boolean)
      .map(mod => ({
        id: mod.id,
        title: mod.title,
        category: mod.category,
        created_at: mod.created_at,
      }));

    return res.status(200).json(result);

  } catch (err: any) {
    console.error('[downloads]', err);
    return res.status(500).json({ error: err.message });
  }
}