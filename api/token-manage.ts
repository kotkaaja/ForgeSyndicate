// api/token-manage.ts — Token Management API (FIXED)
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];

function generateToken(length = 24): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

async function getSession(sessionId: string) {
  const { data } = await supabaseAdmin
    .from('user_sessions')
    .select('discord_id, username, guild_roles, tier')
    .eq('id', sessionId).single();
  return data;
}

function isAdminSession(session: any): boolean {
  return (session?.guild_roles || []).some((r: string) => ADMIN_ROLES.includes(r.toLowerCase()));
}

async function getClaimsFile() {
  const githubToken = process.env.GITHUB_TOKEN;
  const repoString  = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const [owner, repo] = repoString.split('/');
  if (!githubToken || !owner || !repo) return null;
  const octokit = new Octokit({ auth: githubToken });
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'claim.json' });
    if ('content' in data) {
      return { octokit, owner, repo, sha: data.sha, content: JSON.parse(Buffer.from(data.content, 'base64').toString()) };
    }
  } catch { /* not found */ }
  return null;
}

async function saveClaimsFile(octokit: Octokit, owner: string, repo: string, sha: string | undefined, content: any, message: string) {
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path: 'claim.json', message,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'), sha,
  });
}

// GET /api/token-manage?action=get-users&sessionId=...
async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
  const { sessionId, search, limit = '50', offset = '0' } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const session = await getSession(sessionId as string);
  if (!session || !isAdminSession(session)) return res.status(403).json({ error: 'Admin only' });

  let query = supabaseAdmin
    .from('user_sessions')
    .select('id, discord_id, username, avatar_url, tier, guild_roles, expiry, last_login, created_at, modder_verified, is_modder')
    .order('last_login', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);
  if (search) query = query.ilike('username', `%${search}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const enriched = await Promise.all((data || []).map(async (u: any) => {
    const { data: claims } = await supabaseAdmin
      .from('token_claims').select('token, tier, expires_at, claimed_at, duration_days')
      .eq('discord_id', u.discord_id).order('claimed_at', { ascending: false }).limit(5);
    return { ...u, token_claims: claims || [] };
  }));

  return res.status(200).json({ users: enriched });
}

async function handleGetUserDetail(req: VercelRequest, res: VercelResponse) {
  const { sessionId, targetDiscordId } = req.query;
  if (!sessionId || !targetDiscordId) return res.status(400).json({ error: 'Missing params' });
  const session = await getSession(sessionId as string);
  if (!session || !isAdminSession(session)) return res.status(403).json({ error: 'Admin only' });

  const { data: user } = await supabaseAdmin.from('user_sessions').select('*').eq('discord_id', targetDiscordId).single();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: claims } = await supabaseAdmin.from('token_claims').select('*').eq('discord_id', targetDiscordId).order('claimed_at', { ascending: false });
  const file = await getClaimsFile();
  const githubData = file?.content?.[targetDiscordId as string] || null;

  return res.status(200).json({ user, token_claims: claims || [], github_data: githubData });
}

// ══════════════════════════════════════════════════════════════════════════════
// FIXED: Admin Add Token - Simpan ke claim.json seperti /give_token di token.py
// ══════════════════════════════════════════════════════════════════════════════
async function handleAdminAddToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, targetDiscordId, tier = 'BASIC', duration_days = 7 } = req.body;
  if (!sessionId || !targetDiscordId) return res.status(400).json({ error: 'Missing params' });
  const session = await getSession(sessionId);
  if (!session || !isAdminSession(session)) return res.status(403).json({ error: 'Admin only' });

  const token = generateToken(24);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Number(duration_days) * 24 * 60 * 60 * 1000);

  // Simpan ke database Supabase
  const { error: insertErr } = await supabaseAdmin.from('token_claims').insert({
    discord_id: targetDiscordId, 
    claimed_at: now.toISOString(), 
    expires_at: expiresAt.toISOString(),
    token, 
    tier: tier.toUpperCase(), 
    duration_days: Number(duration_days),
  });
  if (insertErr) throw insertErr;

  // Update tier user jika VIP
  if (tier.toUpperCase() === 'VIP') {
    await supabaseAdmin.from('user_sessions').update({ 
      tier: 'VIP', 
      expiry: expiresAt.toISOString() 
    }).eq('discord_id', targetDiscordId);
  }

  // ✅ SIMPAN KE CLAIM.JSON (Like token.py /give_token)
  const file = await getClaimsFile();
  if (file) {
    const { octokit, owner, repo, sha, content } = file;
    const existing = content[targetDiscordId] || {};
    const existingTokens = Array.isArray(existing.tokens) ? existing.tokens : [];
    
    // Tambahkan token baru ke array
    existingTokens.push({ 
      token, 
      expiry_timestamp: expiresAt.toISOString(), 
      source_alias: tier.toLowerCase(), 
      assigned_by_admin: session.discord_id,
      hwid: null,
      claimed_at: now.toISOString() 
    });
    
    // Update struktur user data
    content[targetDiscordId] = { 
      ...existing, 
      tokens: existingTokens, 
      current_token: token, 
      token_expiry_timestamp: expiresAt.toISOString(), 
      expiry_timestamp: expiresAt.toISOString(), 
      source_alias: tier.toLowerCase(), 
      hwid: existing.hwid || null
    };
    
    await saveClaimsFile(octokit, owner, repo, sha, content, `chore: admin add ${tier} token for ${targetDiscordId}`);
  }

  await supabaseAdmin.from('admin_logs').insert({ 
    admin_id: session.discord_id, 
    admin_name: session.username, 
    action: 'add_token', 
    target_type: 'user', 
    target_id: targetDiscordId, 
    target_label: `Add ${tier} token (${duration_days}d)`, 
    metadata: { token, tier, duration_days, expires_at: expiresAt.toISOString() } 
  });
  
  return res.status(200).json({ 
    success: true, 
    token, 
    tier: tier.toUpperCase(), 
    expires_at: expiresAt.toISOString() 
  });
}

async function handleAdminExtendToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, targetDiscordId, token, extend_days = 7 } = req.body;
  if (!sessionId || !targetDiscordId || !token) return res.status(400).json({ error: 'Missing params' });
  const session = await getSession(sessionId);
  if (!session || !isAdminSession(session)) return res.status(403).json({ error: 'Admin only' });

  const { data: claim } = await supabaseAdmin.from('token_claims').select('*').eq('discord_id', targetDiscordId).eq('token', token).single();
  if (!claim) return res.status(404).json({ error: 'Token not found' });

  const newExpiry = new Date(Math.max(new Date(claim.expires_at).getTime(), Date.now()) + Number(extend_days) * 24 * 60 * 60 * 1000);
  await supabaseAdmin.from('token_claims').update({ expires_at: newExpiry.toISOString() }).eq('discord_id', targetDiscordId).eq('token', token);

  const file = await getClaimsFile();
  if (file) {
    const { octokit, owner, repo, sha, content } = file;
    const userData = content[targetDiscordId];
    if (userData) {
      if (Array.isArray(userData.tokens)) userData.tokens = userData.tokens.map((t: any) => t.token === token ? { ...t, expiry_timestamp: newExpiry.toISOString() } : t);
      if (userData.current_token === token) { userData.token_expiry_timestamp = newExpiry.toISOString(); userData.expiry_timestamp = newExpiry.toISOString(); }
      content[targetDiscordId] = userData;
      await saveClaimsFile(octokit, owner, repo, sha, content, `chore: extend token for ${targetDiscordId} by ${extend_days}d`);
    }
  }
  await supabaseAdmin.from('admin_logs').insert({ admin_id: session.discord_id, admin_name: session.username, action: 'extend_token', target_type: 'user', target_id: targetDiscordId, target_label: `Extend token +${extend_days}d`, metadata: { token, extend_days, new_expiry: newExpiry.toISOString() } });
  return res.status(200).json({ success: true, new_expiry: newExpiry.toISOString() });
}

async function handleAdminDeleteToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, targetDiscordId, token } = req.body;
  if (!sessionId || !targetDiscordId || !token) return res.status(400).json({ error: 'Missing params' });
  const session = await getSession(sessionId);
  if (!session || !isAdminSession(session)) return res.status(403).json({ error: 'Admin only' });

  await supabaseAdmin.from('token_claims').delete().eq('discord_id', targetDiscordId).eq('token', token);
  const file = await getClaimsFile();
  if (file) {
    const { octokit, owner, repo, sha, content } = file;
    const userData = content[targetDiscordId];
    if (userData?.tokens) {
      userData.tokens = userData.tokens.filter((t: any) => t.token !== token);
      if (userData.current_token === token) { const latest = userData.tokens.at(-1); userData.current_token = latest?.token || ''; userData.token_expiry_timestamp = latest?.expiry_timestamp || null; }
      content[targetDiscordId] = userData;
      await saveClaimsFile(octokit, owner, repo, sha, content, `chore: admin delete token for ${targetDiscordId}`);
    }
  }
  await supabaseAdmin.from('admin_logs').insert({ admin_id: session.discord_id, admin_name: session.username, action: 'delete_token', target_type: 'user', target_id: targetDiscordId, target_label: `Delete token for ${targetDiscordId}`, metadata: { token } });
  return res.status(200).json({ success: true });
}

// ══════════════════════════════════════════════════════════════════════════════
// FIXED: Reset Cooldown - Hapus last_claim_timestamp untuk reset cooldown claim
// ══════════════════════════════════════════════════════════════════════════════
async function handleAdminResetCooldown(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, targetDiscordId } = req.body;
  if (!sessionId || !targetDiscordId) return res.status(400).json({ error: 'Missing params' });
  const session = await getSession(sessionId);
  if (!session || !isAdminSession(session)) return res.status(403).json({ error: 'Admin only' });

  // Reset cooldown dengan menghapus last_claim dari claim.json
  const file = await getClaimsFile();
  if (file) {
    const { octokit, owner, repo, sha, content } = file;
    const userData = content[targetDiscordId];
    if (userData) {
      // Hapus last_claim_timestamp untuk reset cooldown
      delete userData.last_claim_timestamp;
      delete userData.last_claim;
      content[targetDiscordId] = userData;
      await saveClaimsFile(octokit, owner, repo, sha, content, `chore: admin reset claim cooldown for ${targetDiscordId}`);
    }
  }

  await supabaseAdmin.from('admin_logs').insert({ 
    admin_id: session.discord_id, 
    admin_name: session.username, 
    action: 'reset_cooldown', 
    target_type: 'user', 
    target_id: targetDiscordId, 
    target_label: `Reset claim cooldown for ${targetDiscordId}`, 
    metadata: {} 
  });
  
  return res.status(200).json({ success: true, message: 'Cooldown claim token berhasil direset' });
}

async function handleAdminResetHwid(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, targetDiscordId, token } = req.body;
  if (!sessionId || !targetDiscordId) return res.status(400).json({ error: 'Missing params' });
  const session = await getSession(sessionId);
  if (!session || !isAdminSession(session)) return res.status(403).json({ error: 'Admin only' });

  const file = await getClaimsFile();
  if (!file) return res.status(500).json({ error: 'Cannot access claim.json' });
  const { octokit, owner, repo, sha, content } = file;
  const userData = content[targetDiscordId];
  if (!userData) return res.status(404).json({ error: 'User not in claim.json' });
  userData.hwid = null;
  userData.tokens = (userData.tokens || []).map((t: any) => (!token || t.token === token) ? { ...t, hwid: null } : t);
  content[targetDiscordId] = userData;
  await saveClaimsFile(octokit, owner, repo, sha, content, `chore: admin reset HWID for ${targetDiscordId}`);
  await supabaseAdmin.from('admin_logs').insert({ admin_id: session.discord_id, admin_name: session.username, action: 'reset_hwid', target_type: 'user', target_id: targetDiscordId, target_label: `Reset HWID for ${targetDiscordId}`, metadata: { token: token || 'all' } });
  return res.status(200).json({ success: true, message: 'HWID berhasil direset' });
}

// ══════════════════════════════════════════════════════════════════════════════
// FIXED: User Reset HWID - Like token.py logic
// ══════════════════════════════════════════════════════════════════════════════
async function handleUserResetHwid(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, token } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const session = await getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Session tidak valid' });

  const file = await getClaimsFile();
  if (!file) return res.status(500).json({ error: 'Cannot access claim.json' });
  const { octokit, owner, repo, sha, content } = file;
  const userData = content[session.discord_id];
  if (!userData) return res.status(404).json({ error: 'Data tidak ditemukan' });

  // Cek cooldown 24 jam
  if (userData.last_hwid_reset) {
    const diff = Date.now() - new Date(userData.last_hwid_reset).getTime();
    if (diff < 24 * 60 * 60 * 1000) {
      const rem = Math.ceil((24 * 60 * 60 * 1000 - diff) / 3600000);
      return res.status(429).json({ error: `Cooldown aktif, coba lagi dalam ${rem} jam` });
    }
  }

  // Reset HWID
  userData.hwid = null;
  userData.last_hwid_reset = new Date().toISOString();
  userData.tokens = (userData.tokens || []).map((t: any) => (!token || t.token === token) ? { ...t, hwid: null } : t);
  content[session.discord_id] = userData;
  await saveClaimsFile(octokit, owner, repo, sha, content, `chore: user reset HWID for ${session.discord_id}`);
  return res.status(200).json({ success: true, message: 'HWID berhasil direset. Tersedia 1x per 24 jam.' });
}

// ══════════════════════════════════════════════════════════════════════════════
// FIXED: User Refund Token - Hanya ganti token baru, waktu tetap jalan
// ══════════════════════════════════════════════════════════════════════════════
async function handleUserRefundToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, token } = req.body;
  if (!sessionId || !token) return res.status(400).json({ error: 'sessionId and token required' });
  const session = await getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Session tidak valid' });

  const file = await getClaimsFile();
  if (!file) return res.status(500).json({ error: 'Cannot access claim.json' });
  
  const { octokit, owner, repo, sha, content } = file;
  const userData = content[session.discord_id];
  if (!userData || !userData.tokens) return res.status(404).json({ error: 'Token tidak ditemukan' });

  // Cari token yang akan di-refund
  const tokenObj = userData.tokens.find((t: any) => t.token === token);
  if (!tokenObj) return res.status(404).json({ error: 'Token tidak ditemukan' });

  // Cek apakah token sudah expired
  const expiryDate = new Date(tokenObj.expiry_timestamp);
  if (expiryDate < new Date()) {
    return res.status(400).json({ error: 'Token sudah expired, tidak bisa di-refund' });
  }

  // Generate token baru dengan expiry yang sama
  const newToken = generateToken(24);
  
  // Update token di array
  userData.tokens = userData.tokens.map((t: any) => {
    if (t.token === token) {
      return {
        ...t,
        token: newToken,
        // PENTING: Waktu expiry tetap sama, tidak direset!
        hwid: null // Reset HWID
      };
    }
    return t;
  });

  // Update current token jika yang di-refund adalah current token
  if (userData.current_token === token) {
    userData.current_token = newToken;
  }

  // Reset HWID
  userData.hwid = null;

  content[session.discord_id] = userData;
  await saveClaimsFile(octokit, owner, repo, sha, content, `chore: user refund token for ${session.discord_id}`);
  
  // Hapus dari Supabase
  await supabaseAdmin.from('token_claims').delete().eq('discord_id', session.discord_id).eq('token', token);
  
  // Insert token baru ke Supabase
  await supabaseAdmin.from('token_claims').insert({
    discord_id: session.discord_id,
    token: newToken,
    tier: tokenObj.source_alias?.toUpperCase() || 'BASIC',
    expires_at: tokenObj.expiry_timestamp,
    claimed_at: new Date().toISOString(),
    duration_days: Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  });

  return res.status(200).json({ 
    success: true, 
    message: 'Token di-refund! Token baru sudah dibuat dengan waktu expiry yang sama.',
    new_token: newToken,
    expires_at: tokenObj.expiry_timestamp
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { action } = req.query;
  try {
    switch (action) {
      case 'get-users':             return await handleGetUsers(req, res);
      case 'get-user-detail':       return await handleGetUserDetail(req, res);
      case 'admin-add-token':       return await handleAdminAddToken(req, res);
      case 'admin-extend-token':    return await handleAdminExtendToken(req, res);
      case 'admin-delete-token':    return await handleAdminDeleteToken(req, res);
      case 'admin-reset-cooldown':  return await handleAdminResetCooldown(req, res);
      case 'admin-reset-hwid':      return await handleAdminResetHwid(req, res);
      case 'user-reset-hwid':       return await handleUserResetHwid(req, res);
      case 'user-refund-token':     return await handleUserRefundToken(req, res);
      default:                      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err: any) {
    console.error('[token-manage]', err);
    return res.status(500).json({ error: err.message });
  }
}