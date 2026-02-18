// api/token-manage.ts — Versi Supabase Only
// Semua operasi token baca/tulis ke Supabase
// GitHub TIDAK lagi disentuh dari sini
//
// Tabel Supabase:
//   token_claims    : discord_id, token, source_alias, expiry_timestamp, hwid, assigned_by_admin, created_at
//   claim_cooldowns : discord_id, last_claim_timestamp
//   user_sessions   : discord_id, username, guild_roles, tier, expiry, ...
//   admin_logs      : untuk audit trail

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const db = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];
const MAX_DAYS    = 9999;
const PERM_YEAR   = 9998;

// =============================================================================
// HELPER
// =============================================================================

function generateToken(length = 24): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function isPermanent(expiryIso?: string | null): boolean {
  if (!expiryIso) return true;
  try { return new Date(expiryIso).getFullYear() >= PERM_YEAR; }
  catch { return false; }
}


async function getSession(sessionId: string) {
  const { data } = await db
    .from('user_sessions')
    .select('discord_id, username, guild_roles, tier')
    .eq('id', sessionId)
    .single();
  return data;
}

function isAdmin(session: any): boolean {
  return (session?.guild_roles || []).some(
    (r: string) => ADMIN_ROLES.includes(r.toLowerCase())
  );
}

async function logAdmin(session: any, action: string, targetId: string,
                         targetLabel: string, metadata: object = {}) {
  await db.from('admin_logs').insert({
    admin_id:     session.discord_id,
    admin_name:   session.username,
    action,
    target_type:  'user',
    target_id:    targetId,
    target_label: targetLabel,
    metadata,
  });
}

// =============================================================================
// GET USERS — daftar semua user + token mereka
// =============================================================================

async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
  const { sessionId, search, limit = '50', offset = '0' } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const session = await getSession(sessionId as string);
  if (!session || !isAdmin(session))
    return res.status(403).json({ error: 'Admin only' });

  let query = db
    .from('user_sessions')
    .select('id, discord_id, username, avatar_url, tier, guild_roles, expiry, last_login, created_at')
    .order('last_login', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (search) query = query.ilike('username', `%${search}%`);

  const { data: users, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Enrich tiap user dengan token mereka dari token_claims
  const enriched = await Promise.all((users || []).map(async (u: any) => {
    const { data: tokens } = await db
      .from('token_claims')
      .select('token, source_alias, expiry_timestamp, hwid, assigned_by_admin, created_at')
      .eq('discord_id', u.discord_id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: cd } = await db
      .from('claim_cooldowns')
      .select('last_claim_timestamp')
      .eq('discord_id', u.discord_id)
      .single();

    return {
      ...u,
      tokens:               tokens || [],
      last_claim_timestamp: cd?.last_claim_timestamp || null,
    };
  }));

  return res.status(200).json({ users: enriched });
}

// =============================================================================
// GET USER DETAIL
// =============================================================================

async function handleGetUserDetail(req: VercelRequest, res: VercelResponse) {
  const { sessionId, targetDiscordId } = req.query;
  if (!sessionId || !targetDiscordId)
    return res.status(400).json({ error: 'Missing params' });

  const session = await getSession(sessionId as string);
  if (!session || !isAdmin(session))
    return res.status(403).json({ error: 'Admin only' });

  const { data: user } = await db
    .from('user_sessions')
    .select('*')
    .eq('discord_id', targetDiscordId)
    .single();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: tokens } = await db
    .from('token_claims')
    .select('*')
    .eq('discord_id', targetDiscordId)
    .order('created_at', { ascending: false });

  const { data: cd } = await db
    .from('claim_cooldowns')
    .select('last_claim_timestamp')
    .eq('discord_id', targetDiscordId)
    .single();

  return res.status(200).json({
    user,
    tokens:               tokens || [],
    last_claim_timestamp: cd?.last_claim_timestamp || null,
  });
}

// =============================================================================
// ADMIN ADD TOKEN
// Simpan ke token_claims Supabase — tidak sentuh GitHub
// =============================================================================

async function handleAdminAddToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, targetDiscordId, tier = 'bassic', duration_days = 7, customToken } = req.body;
  if (!sessionId || !targetDiscordId)
    return res.status(400).json({ error: 'Missing params' });

  const session = await getSession(sessionId);
  if (!session || !isAdmin(session))
    return res.status(403).json({ error: 'Admin only' });

  const token      = customToken?.trim() || generateToken(24);
  const now        = new Date();
  const days       = Math.min(Number(duration_days), MAX_DAYS);
  const expiresAt  = days >= MAX_DAYS
    ? new Date('9999-12-31T23:59:59Z')
    : new Date(now.getTime() + days * 86400000);
  const tierLower  = (tier as string).toLowerCase();

  // Cek token sudah ada
  const { data: existing } = await db
    .from('token_claims')
    .select('discord_id')
    .eq('token', token)
    .single();

  if (existing) {
    return res.status(409).json({
      error: existing.discord_id === targetDiscordId
        ? 'Token sudah dimiliki user ini'
        : 'Token sudah dimiliki user lain'
    });
  }

  // Insert ke token_claims
  const { error: insertErr } = await db.from('token_claims').insert({
    discord_id:        targetDiscordId,
    token,
    source_alias:      tierLower,
    expiry_timestamp:  expiresAt.toISOString(),
    hwid:              null,
    assigned_by_admin: session.discord_id,
  });
  if (insertErr) return res.status(500).json({ error: insertErr.message });

  // Update tier user jika VIP
  if (tierLower === 'vip') {
    await db.from('user_sessions').update({
      tier:   'VIP',
      expiry: expiresAt.toISOString(),
    }).eq('discord_id', targetDiscordId);
  }

  await logAdmin(session, 'add_token', targetDiscordId,
    `Add ${tier} token (${days}d)`,
    { token, tier, duration_days: days, expires_at: expiresAt.toISOString() });

  return res.status(200).json({
    success:    true,
    token,
    tier:       tier.toString().toUpperCase(),
    expires_at: expiresAt.toISOString(),
    permanent:  isPermanent(expiresAt.toISOString()),
  });
}

// =============================================================================
// ADMIN EXTEND TOKEN
// =============================================================================

async function handleAdminExtendToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, targetDiscordId, token, extend_days = 7 } = req.body;
  if (!sessionId || !targetDiscordId || !token)
    return res.status(400).json({ error: 'Missing params' });

  const session = await getSession(sessionId);
  if (!session || !isAdmin(session))
    return res.status(403).json({ error: 'Admin only' });

  const { data: claim } = await db
    .from('token_claims')
    .select('expiry_timestamp')
    .eq('discord_id', targetDiscordId)
    .eq('token', token)
    .single();
  if (!claim) return res.status(404).json({ error: 'Token tidak ditemukan' });

  // Kalau token permanen, tidak perlu extend
  if (isPermanent(claim.expiry_timestamp)) {
    return res.status(400).json({ error: 'Token sudah permanen, tidak perlu di-extend' });
  }

  const base      = new Date(Math.max(new Date(claim.expiry_timestamp).getTime(), Date.now()));
  const newExpiry = new Date(base.getTime() + Number(extend_days) * 86400000);

  const { error } = await db
    .from('token_claims')
    .update({ expiry_timestamp: newExpiry.toISOString() })
    .eq('discord_id', targetDiscordId)
    .eq('token', token);
  if (error) return res.status(500).json({ error: error.message });

  await logAdmin(session, 'extend_token', targetDiscordId,
    `Extend token +${extend_days}d`,
    { token, extend_days, new_expiry: newExpiry.toISOString() });

  return res.status(200).json({
    success:    true,
    new_expiry: newExpiry.toISOString(),
  });
}

// =============================================================================
// ADMIN DELETE TOKEN
// =============================================================================

async function handleAdminDeleteToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, targetDiscordId, token } = req.body;
  if (!sessionId || !targetDiscordId || !token)
    return res.status(400).json({ error: 'Missing params' });

  const session = await getSession(sessionId);
  if (!session || !isAdmin(session))
    return res.status(403).json({ error: 'Admin only' });

  const { error } = await db
    .from('token_claims')
    .delete()
    .eq('discord_id', targetDiscordId)
    .eq('token', token);
  if (error) return res.status(500).json({ error: error.message });

  await logAdmin(session, 'delete_token', targetDiscordId,
    `Delete token for ${targetDiscordId}`, { token });

  return res.status(200).json({ success: true });
}

// =============================================================================
// ADMIN RESET COOLDOWN
// =============================================================================

async function handleAdminResetCooldown(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, targetDiscordId } = req.body;
  if (!sessionId || !targetDiscordId)
    return res.status(400).json({ error: 'Missing params' });

  const session = await getSession(sessionId);
  if (!session || !isAdmin(session))
    return res.status(403).json({ error: 'Admin only' });

  // Hapus row cooldown → cooldown = tidak ada = bisa klaim kapan saja
  await db.from('claim_cooldowns').delete().eq('discord_id', targetDiscordId);

  await logAdmin(session, 'reset_cooldown', targetDiscordId,
    `Reset claim cooldown for ${targetDiscordId}`);

  return res.status(200).json({
    success: true,
    message: 'Cooldown klaim token berhasil direset',
  });
}

// =============================================================================
// ADMIN RESET HWID
// Bisa reset satu token spesifik atau semua token user
// =============================================================================

async function handleAdminResetHwid(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, targetDiscordId, token } = req.body;
  if (!sessionId || !targetDiscordId)
    return res.status(400).json({ error: 'Missing params' });

  const session = await getSession(sessionId);
  if (!session || !isAdmin(session))
    return res.status(403).json({ error: 'Admin only' });

  if (token) {
    // Reset HWID token spesifik
    const { error } = await db
      .from('token_claims')
      .update({ hwid: null })
      .eq('discord_id', targetDiscordId)
      .eq('token', token);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    // Reset HWID semua token user
    const { error } = await db
      .from('token_claims')
      .update({ hwid: null })
      .eq('discord_id', targetDiscordId);
    if (error) return res.status(500).json({ error: error.message });
  }

  await logAdmin(session, 'reset_hwid', targetDiscordId,
    `Reset HWID for ${targetDiscordId}`, { token: token || 'all' });

  return res.status(200).json({
    success: true,
    message: token ? `HWID token \`${token}\` direset` : 'HWID semua token direset',
  });
}

// =============================================================================
// USER RESET HWID (self-service, cooldown 24 jam)
// =============================================================================

async function handleUserResetHwid(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, token } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const session = await getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Session tidak valid' });

  // Cek cooldown reset HWID 24 jam
  const { data: tokenRow } = await db
    .from('token_claims')
    .select('last_hwid_reset, hwid')
    .eq('discord_id', session.discord_id)
    .eq('token', token || '')
    .single();

  if (tokenRow?.last_hwid_reset) {
    const diff = Date.now() - new Date(tokenRow.last_hwid_reset).getTime();
    if (diff < 86400000) {
      const remHours = Math.ceil((86400000 - diff) / 3600000);
      return res.status(429).json({
        error: `Cooldown aktif, coba lagi dalam ${remHours} jam`,
      });
    }
  }

  if (token) {
    // Reset HWID token spesifik milik user
    const { error } = await db
      .from('token_claims')
      .update({ hwid: null, last_hwid_reset: new Date().toISOString() })
      .eq('discord_id', session.discord_id)
      .eq('token', token);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    // Reset HWID semua token milik user
    const { error } = await db
      .from('token_claims')
      .update({ hwid: null, last_hwid_reset: new Date().toISOString() })
      .eq('discord_id', session.discord_id);
    if (error) return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    success: true,
    message: 'HWID direset. Tersedia 1x per 24 jam.',
  });
}

// =============================================================================
// USER REFUND TOKEN
// Ganti token baru dengan expiry yang sama, HWID direset
// =============================================================================

async function handleUserRefundToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, token } = req.body;
  if (!sessionId || !token)
    return res.status(400).json({ error: 'sessionId and token required' });

  const session = await getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Session tidak valid' });

  const { data: tokenRow } = await db
    .from('token_claims')
    .select('*')
    .eq('discord_id', session.discord_id)
    .eq('token', token)
    .single();

  if (!tokenRow) return res.status(404).json({ error: 'Token tidak ditemukan' });

  // Jangan refund token yang sudah expired
  if (!isPermanent(tokenRow.expiry_timestamp) &&
      new Date(tokenRow.expiry_timestamp) < new Date()) {
    return res.status(400).json({
      error: 'Token sudah expired, tidak bisa di-refund',
    });
  }

  const newToken = generateToken(24);

  // Update token lama → token baru, hwid di-reset, expiry tetap sama
  const { error } = await db
    .from('token_claims')
    .update({
      token:           newToken,
      hwid:            null,
      last_hwid_reset: null,
    })
    .eq('discord_id', session.discord_id)
    .eq('token', token);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    success:    true,
    message:    'Token di-refund! Token baru dibuat dengan waktu expiry yang sama.',
    new_token:  newToken,
    expires_at: tokenRow.expiry_timestamp,
    permanent:  isPermanent(tokenRow.expiry_timestamp),
  });
}

// =============================================================================
// GET TOKEN LIST (untuk UserPanel / UserProfileCard)
// Dipanggil oleh /api/user?action=claim
// =============================================================================

async function handleGetUserTokens(req: VercelRequest, res: VercelResponse) {
  const { sessionId, userId } = req.query;

  // Bisa dipanggil dengan sessionId (user sendiri) atau userId (admin lihat user lain)
  let discordId: string;

  if (sessionId) {
    const session = await getSession(sessionId as string);
    if (!session) return res.status(401).json({ error: 'Session tidak valid' });
    discordId = session.discord_id;
  } else if (userId) {
    discordId = userId as string;
  } else {
    return res.status(400).json({ error: 'sessionId atau userId diperlukan' });
  }

  const { data: tokens } = await db
    .from('token_claims')
    .select('token, source_alias, expiry_timestamp, hwid, assigned_by_admin, created_at')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: true });

  const { data: cd } = await db
    .from('claim_cooldowns')
    .select('last_claim_timestamp')
    .eq('discord_id', discordId)
    .single();

  const now          = new Date();
  const activeTokens = (tokens || []).filter(t => {
    if (isPermanent(t.expiry_timestamp)) return true;
    try { return new Date(t.expiry_timestamp) > now; }
    catch { return false; }
  });

  // Tandai current_token (token aktif terbaru)
  const lastActive = activeTokens.at(-1);
  const enriched   = activeTokens.map(t => ({
    ...t,
    is_current: t.token === lastActive?.token,
    permanent:  isPermanent(t.expiry_timestamp),
  }));

  return res.status(200).json({
    tokens:               enriched,
    last_claim_timestamp: cd?.last_claim_timestamp || null,
    current_token:        lastActive?.token || null,
  });
}

// =============================================================================
// CLAIM TOKEN (user klaim token baru dari web)
// =============================================================================

async function handleClaimToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const session = await getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Session tidak valid' });

  const discordId = session.discord_id;
  const now       = new Date();

  // Cek cooldown 7 hari
  const { data: cd } = await db
    .from('claim_cooldowns')
    .select('last_claim_timestamp')
    .eq('discord_id', discordId)
    .single();

  if (cd?.last_claim_timestamp) {
    const last      = new Date(cd.last_claim_timestamp);
    const nextClaim = new Date(last.getTime() + 7 * 86400000);
    if (now < nextClaim) {
      return res.status(429).json({
        error:      'Cooldown aktif',
        next_claim: nextClaim.toISOString(),
      });
    }
  }

  // Tentukan durasi berdasarkan tier user
  const tier        = (session.tier || 'basic').toLowerCase();
  const TIER_DAYS: Record<string, number> = {
    vip:         1,
    innercircle: 7,
    supporter:   7,
    basic:       7,
    bassic:      7,
  };
  const days       = TIER_DAYS[tier] ?? 7;
  const expiresAt  = new Date(now.getTime() + days * 86400000);
  const newToken   = generateToken(24);
  const alias      = tier === 'vip' ? 'vip' : 'bassic';

  // Insert token baru
  const { error: insertErr } = await db.from('token_claims').insert({
    discord_id:       discordId,
    token:            newToken,
    source_alias:     alias,
    expiry_timestamp: expiresAt.toISOString(),
    hwid:             null,
  });
  if (insertErr) return res.status(500).json({ error: insertErr.message });

  // Update cooldown
  await db.from('claim_cooldowns').upsert({
    discord_id:           discordId,
    last_claim_timestamp: now.toISOString(),
  }, { onConflict: 'discord_id' });

  return res.status(200).json({
    success:    true,
    token:      newToken,
    expires_at: expiresAt.toISOString(),
    permanent:  false,
  });
}

// =============================================================================
// ROUTER
// =============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action } = req.query;

  try {
    switch (action) {
      // Admin
      case 'get-users':            return await handleGetUsers(req, res);
      case 'get-user-detail':      return await handleGetUserDetail(req, res);
      case 'admin-add-token':      return await handleAdminAddToken(req, res);
      case 'admin-extend-token':   return await handleAdminExtendToken(req, res);
      case 'admin-delete-token':   return await handleAdminDeleteToken(req, res);
      case 'admin-reset-cooldown': return await handleAdminResetCooldown(req, res);
      case 'admin-reset-hwid':     return await handleAdminResetHwid(req, res);
      // User
      case 'get-tokens':           return await handleGetUserTokens(req, res);
      case 'claim-token':          return await handleClaimToken(req, res);
      case 'user-reset-hwid':      return await handleUserResetHwid(req, res);
      case 'user-refund-token':    return await handleUserRefundToken(req, res);

      default: return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err: any) {
    console.error('[token-manage]', err);
    return res.status(500).json({ error: err.message });
  }
}