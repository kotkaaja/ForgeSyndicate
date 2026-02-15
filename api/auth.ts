// api/auth.ts
// Consolidated auth endpoints: /api/auth?action=login|logout|session|callback
// Combines: login.ts, logout.ts, session.ts, callback.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_API    = 'https://discord.com/api/v10';
const CLIENT_ID      = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET  = process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI   = process.env.DISCORD_REDIRECT_URI!;
const GUILD_ID       = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN      = process.env.DISCORD_BOT_TOKEN!;
const GITHUB_TOKEN   = process.env.GITHUB_TOKEN!;
const CLAIMS_REPO    = process.env.CLAIMS_REPO!;
const CLAIMS_FILE    = process.env.CLAIMS_FILE || 'claims.json';
const FRONTEND_URL   = process.env.FRONTEND_URL || 'https://yourdomain.com';

const ROLE_TIER: Record<string, 'VIP' | 'BASIC'> = {
  'Admin': 'VIP', 'Administrator': 'VIP', 'Owner': 'VIP', 'Founder': 'VIP',
  'Co-Founder': 'VIP', 'Moderator': 'VIP', 'Developer': 'VIP',
  'VIP': 'VIP', 'VIP+': 'VIP', 'Vip': 'VIP', 'VIP Supreme': 'VIP', 'Supporter': 'VIP',
  'Beginner': 'BASIC', 'BASIC': 'BASIC', 'Member': 'BASIC', 'User': 'BASIC',
};

async function fetchClaims(): Promise<Record<string, any>> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${CLAIMS_REPO}/contents/${CLAIMS_FILE}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return {};
    const data: any = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch { return {}; }
}

function findUserExpiry(claims: Record<string, any>, discordId: string): string | null {
  const userData = claims[discordId];
  if (!userData) return null;
  if (userData.expiry_timestamp) return userData.expiry_timestamp;
  if (userData.token_expiry_timestamp) return userData.token_expiry_timestamp;
  if (userData.tokens && Array.isArray(userData.tokens)) {
    const sorted = [...userData.tokens].sort((a, b) => {
      const da = new Date(a.expiry_timestamp || 0).getTime();
      const db = new Date(b.expiry_timestamp || 0).getTime();
      return db - da;
    });
    if (sorted[0]?.expiry_timestamp) return sorted[0].expiry_timestamp;
  }
  return null;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds.members.read',
    prompt: 'none',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}

// ─── CALLBACK ─────────────────────────────────────────────────────────────────
async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;

  if (error) return res.redirect(`${FRONTEND_URL}/?auth=cancelled`);
  if (!code || typeof code !== 'string') return res.redirect(`${FRONTEND_URL}/?auth=error&msg=no_code`);

  try {
    // 1. Exchange code → access token
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) return res.redirect(`${FRONTEND_URL}/?auth=error&msg=token_exchange_failed`);
    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user info
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user: any = await userRes.json();

    let avatarUrl: string | null = null;
    if (user.avatar) {
      const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
    } else {
      const idx = (BigInt(user.id) >> 22n) % 6n;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }

    // 3. Fetch member info
    let memberRoles: string[] = [];
    let memberRoleIds: string[] = [];
    let guildJoinedAt: string | null = null;
    let userTierLevel = 0;

    try {
      const guildRolesRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      const guildRoles: any[] = await guildRolesRes.json();

      const memberRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${user.id}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });

      if (memberRes.ok) {
        const member: any = await memberRes.json();
        memberRoleIds = member.roles || [];
        guildJoinedAt = member.joined_at || null;

        const roleMap = new Map(guildRoles.map((r: any) => [r.id, r.name]));
        memberRoles = memberRoleIds.map(id => roleMap.get(id)).filter(Boolean) as string[];

        for (const roleName of memberRoles) {
          if (ROLE_TIER[roleName] === 'VIP') { userTierLevel = 2; break; }
          if (ROLE_TIER[roleName] === 'BASIC' && userTierLevel < 2) { userTierLevel = 1; }
        }
      }
    } catch (e) {
      console.error('[CALLBACK] Gagal fetch guild member:', e);
    }

    // 4. Fetch expiry
    let expiryTimestamp: string | null = null;
    try {
      const claims = await fetchClaims();
      expiryTimestamp = findUserExpiry(claims, user.id);
      if (expiryTimestamp && new Date().toISOString() > expiryTimestamp) {
        if (userTierLevel === 2) userTierLevel = 1;
      }
    } catch {}

    const userTier = userTierLevel === 2 ? 'VIP' : userTierLevel === 1 ? 'BASIC' : 'GUEST';

    // 5. Upsert session
    const sessionData = {
      discord_id: user.id,
      username: user.global_name || user.username,
      discriminator: user.discriminator || '0',
      avatar_url: avatarUrl,
      email: user.email || null,
      guild_roles: memberRoles,
      tier: userTier,
      expiry: expiryTimestamp,
      guild_joined_at: guildJoinedAt,
      access_token: accessToken,
      last_login: new Date().toISOString(),
    };

    const { data: sessionRow, error: dbError } = await supabase
      .from('user_sessions')
      .upsert(sessionData, { onConflict: 'discord_id' })
      .select('id')
      .single();

    if (dbError) throw dbError;

    res.redirect(`${FRONTEND_URL}/#/auth/success?session=${sessionRow.id}`);
  } catch (err) {
    console.error('[CALLBACK] Error:', err);
    res.redirect(`${FRONTEND_URL}/?auth=error&msg=internal`);
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function handleLogout(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.body;
  if (sessionId) {
    await supabase.from('user_sessions').delete().eq('id', sessionId);
  }
  return res.status(200).json({ ok: true });
}

// ─── SESSION ──────────────────────────────────────────────────────────────────
async function handleSession(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const { data, error } = await supabase
    .from('user_sessions')
    .select('discord_id, username, avatar_url, guild_roles, tier, expiry, guild_joined_at, last_login')
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Session not found' });
  return res.status(200).json(data);
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action, code } = req.query;

  // Callback detection (has code param)
  if (code) return handleCallback(req, res);

  // Action-based routing
  switch (action) {
    case 'login':   return handleLogin(req, res);
    case 'logout':  return handleLogout(req, res);
    case 'session': return handleSession(req, res);
    default:        return res.status(400).json({ error: 'Invalid action' });
  }
}