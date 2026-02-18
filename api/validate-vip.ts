// api/validate-vip.ts — FULL SUPABASE VERSION (tanpa GitHub)
// Sebelumnya: baca claims.json dari GitHub API (300-800ms)
// Sekarang:   SELECT dari Supabase token_claims (~5-20ms)
// gate.py juga sudah pakai Supabase — kedua validator konsisten

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false, error: 'Token kosong' });

  try {
    // Query langsung ke Supabase — satu query, index by token (UNIQUE)
    const { data: row, error } = await supabaseAdmin
      .from('token_claims')
      .select('discord_id, source_alias, expiry_timestamp, expires_at, hwid')
      .eq('token', token.trim())
      .single();

    if (error || !row) {
      return res.status(200).json({ valid: false });
    }

    // Normalize expiry (support dua field: bot Discord & website)
    const expiry = row.expiry_timestamp || row.expires_at || null;

    // Cek expired
    if (expiry) {
      const expDate = new Date(expiry);
      if (expDate.getFullYear() < 9998 && new Date() > expDate) {
        return res.status(200).json({ valid: false, error: 'Token expired', expired: true });
      }
    }

    const role = (row.source_alias || 'vip').toLowerCase();

    return res.status(200).json({
      valid:   true,
      userId:  row.discord_id,
      role:    role,
      expiry:  expiry,
      token:   token.trim(),
    });

  } catch (error) {
    console.error('Internal Error:', error);
    return res.status(500).json({ valid: false, error: 'Internal Server Error' });
  }
}