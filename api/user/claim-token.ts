// api/user/claim-token.ts
// Endpoint: POST /api/user/claim-token
// Body: { sessionId: string }
// ONLY Inner Circle role can claim token (once per week / 7 days cooldown)

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Role Config ─────────────────────────────────────────────────────────────
// HANYA Inner Circle yang bisa claim token
const INNER_CIRCLE_ROLE = 'inner circle';

// Determine tier dari roles user (VIP roles get VIP token, otherwise BASIC)
const VIP_ROLES   = ['inner circle', 'admin', 'high council', 'vip supreme'];

// Cooldown: 7 hari untuk semua (sekali per minggu)
const COOLDOWN_DAYS = 7;

// Durasi token setelah diklaim
const TOKEN_DURATION_DAYS: Record<string, number> = {
  VIP:   1,      // VIP token berlaku 1 hari
  BASIC: 7,      // BASIC token berlaku 7 hari
};

function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function detectTier(roles: string[]): 'VIP' | 'BASIC' {
  const lower = roles.map(r => r.toLowerCase());
  // Cek apakah user punya VIP role
  if (VIP_ROLES.some(r => lower.includes(r))) return 'VIP';
  return 'BASIC';
}

function hasInnerCircle(roles: string[]): boolean {
  return roles.some(r => r.toLowerCase() === INNER_CIRCLE_ROLE);
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

    // 2. Cek apakah user punya role Inner Circle
    if (!hasInnerCircle(guild_roles)) {
      return res.status(403).json({
        error:   'Role tidak memenuhi syarat',
        message: 'Hanya member dengan role Inner Circle yang bisa claim token gratis',
      });
    }

    // 3. Tentukan tier (VIP atau BASIC berdasarkan roles lainnya)
    const tier = detectTier(guild_roles);

    // 4. Cek cooldown — ambil klaim terbaru user ini (cooldown 7 hari untuk semua)
    const { data: lastClaim } = await supabaseAdmin
      .from('token_claims')
      .select('claimed_at, tier')
      .eq('discord_id', discord_id)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastClaim) {
      const cooldownMs    = COOLDOWN_DAYS * 24 * 60 * 60 * 1000; // 7 hari
      const lastClaimedAt = new Date(lastClaim.claimed_at).getTime();
      const nextClaimAt   = new Date(lastClaimedAt + cooldownMs);
      const now           = new Date();

      if (now < nextClaimAt) {
        const diff    = nextClaimAt.getTime() - now.getTime();
        const hours   = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const days    = Math.floor(diff / (24 * 3600000));
        return res.status(429).json({
          error:       'Cooldown belum selesai',
          next_claim:  nextClaimAt.toISOString(),
          wait:        days > 0 ? `${days} hari ${hours % 24}j` : `${hours}j ${minutes}m`,
        });
      }
    }

    // 5. Generate token & hitung expiry
    const token      = generateToken(24);
    const now        = new Date();
    const expiresAt  = new Date(now.getTime() + TOKEN_DURATION_DAYS[tier] * 24 * 60 * 60 * 1000);

    // 6. Simpan ke token_claims
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

    // 7. Sync ke claim.json (background, tidak blocking)
    syncClaimJson(discord_id, token, tier, expiresAt.toISOString());

    // 8. Kirim notifikasi Discord webhook (background)
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