// api/user/claim-token.ts
// Endpoint: POST /api/user/claim-token
// Body: { sessionId: string }

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Role Config ─────────────────────────────────────────────────────────────
const VIP_ROLES   = ['vip', 'high council', 'early supporter'];
const BASIC_ROLES = ['member', 'basic', 'script kiddie', 'cleo user'];

// Cooldown: berapa hari harus tunggu sebelum bisa claim lagi
const COOLDOWN_DAYS: Record<string, number> = {
  VIP:   1,   // VIP bisa claim setiap hari (token 1 hari)
  BASIC: 7,   // Basic bisa claim tiap minggu (token 7 hari)
};

// Durasi token setelah diklaim
const TOKEN_DURATION_DAYS: Record<string, number> = {
  VIP:   1,
  BASIC: 7,
};

function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function detectTier(roles: string[]): 'VIP' | 'BASIC' | null {
  const lower = roles.map(r => r.toLowerCase());
  if (VIP_ROLES.some(r => lower.includes(r)))   return 'VIP';
  if (BASIC_ROLES.some(r => lower.includes(r))) return 'BASIC';
  return null;
}

// ─── Sync ke claim.json di GitHub ────────────────────────────────────────────
async function syncClaimJson(discordId: string, token: string, tier: string, expiresAt: string) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) return;
  try {
    const octokit  = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const filePath = 'claim.json';
    let currentData: Record<string, any> = {};
    let sha: string | undefined;

    try {
      const { data } = await octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER!,
        repo:  process.env.GITHUB_REPO!,
        path:  filePath,
      });
      if ('content' in data) {
        currentData = JSON.parse(Buffer.from(data.content, 'base64').toString());
        sha = data.sha;
      }
    } catch { /* file tidak ada, buat baru */ }

    currentData[discordId] = { token, tier, expires_at: expiresAt, claimed_at: new Date().toISOString() };

    await octokit.repos.createOrUpdateFileContents({
      owner:   process.env.GITHUB_OWNER!,
      repo:    process.env.GITHUB_REPO!,
      path:    filePath,
      message: `chore: claim token for ${discordId}`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      sha,
    });
  } catch (err) {
    console.error('[claim-token] Gagal sync claim.json:', err);
  }
}

// ─── Send Discord Webhook ─────────────────────────────────────────────────────
async function sendWebhookNotif(username: string, tier: string, expiresAt: string) {
  if (!process.env.DISCORD_WEBHOOK_CLAIM) return;
  try {
    await fetch(process.env.DISCORD_WEBHOOK_CLAIM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title:       '🎫 Token Diklaim',
          color:       tier === 'VIP' ? 0xFFD700 : 0x22C55E,
          description: `**${username}** berhasil claim token **${tier}**`,
          fields:      [{ name: 'Berlaku hingga', value: new Date(expiresAt).toLocaleString('id-ID'), inline: true }],
          timestamp:   new Date().toISOString(),
        }],
      }),
    });
  } catch { /* best-effort */ }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan' });

  try {
    // 1. Ambil session dari Supabase
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles, tier, expiry')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) return res.status(401).json({ error: 'Session tidak valid' });
    if (session.expiry && new Date(session.expiry) < new Date()) {
      return res.status(401).json({ error: 'Session sudah expired, silakan login ulang' });
    }

    const { discord_id, username, guild_roles = [] } = session;

    // 2. Tentukan tier
    const tier = detectTier(guild_roles);
    if (!tier) {
      return res.status(403).json({
        error:   'Role tidak memenuhi syarat',
        message: 'Kamu perlu role Member atau VIP untuk claim token',
      });
    }

    // 3. Cek cooldown — ambil klaim terbaru user ini
    const { data: lastClaim } = await supabaseAdmin
      .from('token_claims')
      .select('claimed_at, tier')
      .eq('discord_id', discord_id)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastClaim) {
      const cooldownMs    = COOLDOWN_DAYS[tier] * 24 * 60 * 60 * 1000;
      const lastClaimedAt = new Date(lastClaim.claimed_at).getTime();
      const nextClaimAt   = new Date(lastClaimedAt + cooldownMs);
      const now           = new Date();

      if (now < nextClaimAt) {
        const diff    = nextClaimAt.getTime() - now.getTime();
        const hours   = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return res.status(429).json({
          error:       'Cooldown belum selesai',
          next_claim:  nextClaimAt.toISOString(),
          wait:        `${hours}j ${minutes}m lagi`,
        });
      }
    }

    // 4. Generate token & hitung expiry
    const token      = generateToken(24);
    const now        = new Date();
    const expiresAt  = new Date(now.getTime() + TOKEN_DURATION_DAYS[tier] * 24 * 60 * 60 * 1000);

    // 5. Simpan ke token_claims
    const { error: insertErr } = await supabaseAdmin
      .from('token_claims')
      .insert({
        discord_id,
        claimed_at:    now.toISOString(),
        expires_at:    expiresAt.toISOString(),
        token,
        tier,
        duration_days: TOKEN_DURATION_DAYS[tier],
      });

    if (insertErr) throw insertErr;

    // 6. Sync ke claim.json (background, tidak blocking)
    syncClaimJson(discord_id, token, tier, expiresAt.toISOString());

    // 7. Kirim notifikasi Discord webhook (background)
    sendWebhookNotif(username, tier, expiresAt.toISOString());

    return res.status(200).json({
      success:    true,
      token,
      tier,
      expires_at: expiresAt.toISOString(),
      duration:   TOKEN_DURATION_DAYS[tier],
      message:    `Token ${tier} berhasil diklaim! Berlaku ${TOKEN_DURATION_DAYS[tier]} hari.`,
    });

  } catch (err: any) {
    console.error('[claim-token]', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}