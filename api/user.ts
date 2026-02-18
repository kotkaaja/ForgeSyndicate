// api/user.ts — FULL SUPABASE VERSION (no GitHub)
// Semua storage: Supabase token_claims, claim_cooldowns, user_sessions
// gate.py tetap kerja karena token_claims sama

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const INNER_CIRCLE_ROLE = 'inner circle';
const COOLDOWN_DAYS     = 7;

// Inner Circle claim: BASIC 7hr + VIP 1hr (sesuai logika lama)
const TOKEN_GRANTS = [
  { tier: 'BASIC', source_alias: 'bassic', duration_days: 7  },
  { tier: 'VIP',   source_alias: 'vip',    duration_days: 1  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function generateToken(length = 24): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function hasInnerCircle(roles: string[]): boolean {
  return roles.some(r => r.toLowerCase() === INNER_CIRCLE_ROLE);
}

async function getSessionUser(sessionId: string) {
  const { data: session, error } = await supabaseAdmin
    .from('user_sessions')
    .select('discord_id, username, guild_roles, tier, avatar_url, expiry')
    .eq('id', sessionId)
    .single();

  if (error || !session) return null;
  return session;
}

// ─── WEBHOOK NOTIFICATION ─────────────────────────────────────────────────────
async function sendWebhookNotif(
  username: string,
  discordId: string,
  avatarUrl: string | null | undefined,
  tokens: Array<{ token: string; tier: string; expiresAt: string; duration_days: number }>
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_CLAIM || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const fields = tokens.map(t => {
      const unixExpiry = Math.floor(new Date(t.expiresAt).getTime() / 1000);
      const tierEmoji  = t.tier === 'VIP' ? '👑' : '🛡️';
      return {
        name:   `${tierEmoji} Token ${t.tier} (${t.duration_days} hari)`,
        value:  `\`\`\`${t.token}\`\`\`Berlaku: <t:${unixExpiry}:D> (<t:${unixExpiry}:R>)`,
        inline: false,
      };
    });

    const payload = {
      embeds: [{
        title:       '🎫 Token Berhasil Diklaim — Inner Circle',
        color:       0xFFD700,
        description: `**${username}** berhasil claim **${tokens.length} token** sekaligus!`,
        fields: [
          { name: '👤 User',      value: `**${username}**\n\`${discordId}\``, inline: true },
          { name: '📦 Jumlah',   value: `**${tokens.length}** token`,         inline: true },
          { name: '🏅 Tier',     value: tokens.map(t => t.tier === 'VIP' ? '👑 VIP' : '🛡️ BASIC').join(' + '), inline: true },
          ...fields,
        ],
        thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
        footer:    { text: 'SA Forge — Inner Circle Claim System' },
        timestamp: new Date().toISOString(),
      }],
    };

    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[webhook] ❌ Failed to send:', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: CLAIM-TOKEN (Inner Circle website) — 100% Supabase
// Sebelumnya: tulis ke GitHub claims.json (primary) + Supabase (backup)
// Sekarang:   hanya Supabase → gate.py otomatis bisa baca token baru
// ══════════════════════════════════════════════════════════════════════════════
async function handleClaimToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan' });

  try {
    const session = await getSessionUser(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session tidak valid, silakan login ulang' });
    }

    const { discord_id, username, guild_roles = [], avatar_url } = session;

    // Cek role Inner Circle
    if (!hasInnerCircle(guild_roles)) {
      return res.status(403).json({
        error:   'Role tidak memenuhi syarat',
        message: 'Hanya member dengan role Inner Circle yang bisa claim token gratis',
      });
    }

    // ── Cek cooldown dari Supabase ────────────────────────────────────────
    const { data: cd } = await supabaseAdmin
      .from('claim_cooldowns')
      .select('last_claim_timestamp')
      .eq('discord_id', discord_id)
      .single();

    if (cd?.last_claim_timestamp) {
      const cooldownMs   = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const lastClaimedAt = new Date(cd.last_claim_timestamp).getTime();
      const nextClaimAt   = new Date(lastClaimedAt + cooldownMs);
      const now           = new Date();

      if (now < nextClaimAt) {
        const diff    = nextClaimAt.getTime() - now.getTime();
        const days    = Math.floor(diff / (24 * 3600000));
        const hours   = Math.floor((diff % (24 * 3600000)) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return res.status(429).json({
          error:      'Cooldown belum selesai',
          next_claim: nextClaimAt.toISOString(),
          wait:       days > 0 ? `${days} hari ${hours}j` : `${hours}j ${minutes}m`,
        });
      }
    }

    // ── Generate token ────────────────────────────────────────────────────
    const now    = new Date();
    const granted = TOKEN_GRANTS.map(g => {
      const token     = generateToken(24);
      const expiresAt = new Date(now.getTime() + g.duration_days * 24 * 60 * 60 * 1000);
      return {
        token,
        tier:          g.tier,
        source_alias:  g.source_alias,
        duration_days: g.duration_days,
        expiresAt:     expiresAt.toISOString(),
      };
    });

    // ── Insert ke Supabase token_claims (PRIMARY — dibaca gate.py) ────────
    const insertRows = granted.map(g => ({
      discord_id,
      token:             g.token,
      source_alias:      g.source_alias,  // 'vip' / 'bassic' — sesuai ALLOWED_SOURCES gate.py
      expiry_timestamp:  g.expiresAt,     // field yang dibaca gate.py
      expires_at:        g.expiresAt,     // alias untuk website
      tier:              g.tier,
      duration_days:     g.duration_days,
      hwid:              null,            // belum bind, gate.py akan bind saat login pertama
      claimed_at:        now.toISOString(),
    }));

    const { error: insertErr } = await supabaseAdmin
      .from('token_claims')
      .insert(insertRows);

    if (insertErr) {
      console.error('[claim-token] Supabase insert error:', insertErr);
      return res.status(500).json({ error: 'Gagal simpan token ke database' });
    }

    // ── Update cooldown ───────────────────────────────────────────────────
    await supabaseAdmin
      .from('claim_cooldowns')
      .upsert({ discord_id, last_claim_timestamp: now.toISOString() }, { onConflict: 'discord_id' });

    // ── Update tier session ke VIP ────────────────────────────────────────
    const vipGrant = granted.find(g => g.tier === 'VIP');
    if (vipGrant) {
      await supabaseAdmin
        .from('user_sessions')
        .update({ tier: 'VIP', expiry: vipGrant.expiresAt })
        .eq('discord_id', discord_id);
    }

    // ── Webhook notif (non-blocking) ──────────────────────────────────────
    sendWebhookNotif(
      username, discord_id, avatar_url,
      granted.map(g => ({
        token:         g.token,
        tier:          g.tier,
        expiresAt:     g.expiresAt,
        duration_days: g.duration_days,
      }))
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      tokens:  granted.map(g => ({
        token:      g.token,
        tier:       g.tier,
        expires_at: g.expiresAt,
        duration:   `${g.duration_days} hari`,
      })),
      message: `✅ Berhasil claim ${granted.length} token!`,
    });

  } catch (err: any) {
    console.error('[claim-token] Error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: CLAIM — Ambil data token user dari Supabase
// Sebelumnya: baca GitHub claims.json
// Sekarang:   SELECT dari token_claims
// Dipakai oleh: AdminUsersTab.tsx dan UserPanel.tsx
// ══════════════════════════════════════════════════════════════════════════════
async function handleClaim(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const { data: tokens, error } = await supabaseAdmin
      .from('token_claims')
      .select('token, source_alias, expiry_timestamp, expires_at, hwid, tier, claimed_at, created_at, assigned_by_admin')
      .eq('discord_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ message: 'License not found' });
    }

    // Normalize field names (support kedua format: bot Discord & website)
    const normalizedTokens = tokens.map((t: any) => {
      const expiry = t.expiry_timestamp || t.expires_at || null;
      const isExpired = expiry
        ? (new Date(expiry).getFullYear() < 9998 && new Date() > new Date(expiry))
        : false;

      return {
        token:            t.token,
        expiry_timestamp: expiry,
        source_alias:     t.source_alias || t.tier?.toLowerCase() || 'vip',
        hwid:             t.hwid ?? null,
        is_current:       false, // tidak ada konsep current_token lagi
        is_expired:       isExpired,
        assigned_by_admin: t.assigned_by_admin ?? null,
        claimed_at:       t.claimed_at || t.created_at,
      };
    });

    // Ambil HWID dari token yang paling baru punya HWID (untuk display di AdminUsersTab)
    const latestHwid = normalizedTokens.find(t => t.hwid)?.hwid ?? null;

    return res.status(200).json({
      tokens:               normalizedTokens,
      current_token:        normalizedTokens[0]?.token || '',
      hwid:                 latestHwid,
      last_claim_timestamp: normalizedTokens[0]?.claimed_at || null,
    });

  } catch (error: any) {
    console.error('[CLAIM_API_ERROR]', error);
    return res.status(500).json({
      message: 'Failed to fetch license data',
      error:   error.message,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: DOWNLOADS — riwayat download user (sudah Supabase, tidak berubah)
// ══════════════════════════════════════════════════════════════════════════════
async function handleDownloads(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    const session = await getSessionUser(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session tidak valid, silakan login ulang' });
    }

    const { data: histData, error: histError } = await supabaseAdmin
      .from('download_history')
      .select('mod_id, created_at')
      .eq('discord_id', session.discord_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (histError) throw histError;
    if (!histData || histData.length === 0) return res.status(200).json([]);

    const modIds = histData.map((h: any) => h.mod_id).filter(Boolean);
    const { data: modsData, error: modsError } = await supabaseAdmin
      .from('mods')
      .select('id, title, category, image_url, created_at')
      .in('id', modIds);

    if (modsError) throw modsError;
    if (!modsData) return res.status(200).json([]);

    const modsMap = new Map(modsData.map((m: any) => [m.id, m]));
    const result  = modIds
      .map((id: string) => modsMap.get(id))
      .filter((mod: any): mod is NonNullable<typeof mod> => mod !== undefined)
      .map((mod: any) => ({
        id:         mod.id,
        title:      mod.title,
        category:   mod.category,
        imageUrl:   mod.image_url,
        created_at: mod.created_at,
      }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[downloads] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: TOKENS — list token user dari Supabase (sudah Supabase, tidak berubah)
// ══════════════════════════════════════════════════════════════════════════════
async function handleTokens(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    const session = await getSessionUser(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session tidak valid, silakan login ulang' });
    }

    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('token_claims')
      .select('*')
      .eq('discord_id', session.discord_id)
      .order('claimed_at', { ascending: false })
      .limit(10);

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) return res.status(200).json([]);

    const result = tokens.map((t: any) => ({
      token:            t.token,
      tier:             t.tier || t.source_alias,
      expiry_timestamp: t.expiry_timestamp || t.expires_at,
      source_alias:     t.source_alias,
      hwid:             t.hwid ?? null,
      claimed_at:       t.claimed_at,
    }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[tokens] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action } = req.query;

  try {
    switch (action) {
      case 'claim-token': return await handleClaimToken(req, res);
      case 'downloads':   return await handleDownloads(req, res);
      case 'tokens':      return await handleTokens(req, res);
      case 'claim':       return await handleClaim(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err: any) {
    console.error('[user API] Unhandled error:', err);
    return res.status(500).json({
      error:   'Internal server error',
      message: err.message,
    });
  }
}