import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const { data, error } = await supabase
    .from('user_sessions')
    .select('discord_id, username, avatar_url, guild_roles, tier, expiry, guild_joined_at, last_login')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.status(200).json(data);
}
