// api/user/tokens.ts
// GET /api/user/tokens?sessionId=xxx
// Get user's token list from Supabase token_claims table

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

    // 2. Get tokens from token_claims table
    const { data: tokens } = await supabaseAdmin
      .from('token_claims')
      .select('*')
      .eq('discord_id', session.discord_id)
      .order('claimed_at', { ascending: false })
      .limit(10);

    if (!tokens || tokens.length === 0) {
      return res.status(200).json([]);
    }

    // 3. Format response
    const result = tokens.map(t => ({
      token: t.token,
      tier: t.tier,
      expiry_timestamp: t.expires_at,
      source_alias: t.tier.toLowerCase(),
      hwid: null, // token_claims tidak punya hwid field
      claimed_at: t.claimed_at,
    }));

    return res.status(200).json(result);

  } catch (err: any) {
    console.error('[tokens]', err);
    return res.status(500).json({ error: err.message });
  }
}