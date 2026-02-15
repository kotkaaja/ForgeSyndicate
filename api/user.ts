// api/user.ts
// Consolidated user endpoints: /api/user?action=claim-token|downloads|tokens|claim
// Combines: claim-token.ts, downloads.ts, tokens.ts, claim.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const INNER_CIRCLE_ROLE = 'inner circle';
const VIP_ROLES = ['inner circle', 'admin', 'high council', 'vip supreme'];
const COOLDOWN_DAYS = 7;
const TOKEN_DURATION_DAYS: Record<string, number> = { VIP: 1, BASIC: 7 };

// Cache untuk claim.json (5 menit)
interface CacheEntry { data: Record<string, any>; expiresAt: number; }
let claimsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function detectTier(roles: string[]): 'VIP' | 'BASIC' {
  const lower = roles.map(r => r.toLowerCase());
  if (VIP_ROLES.some(r => lower.includes(r))) return 'VIP';
  return 'BASIC';
}

function hasInnerCircle(roles: string[]): boolean {
  return roles.some(r => r.toLowerCase() === INNER_CIRCLE_ROLE);
}

async function syncClaimJson(discordId: string, token: string, tier: string, expiresAt: string) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) return;
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const filePath = 'claim.json';
    let currentData: Record<string, any> = {};
    let sha: string | undefined;

    try {
      const { data } = await octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        path: filePath,
      });
      if ('content' in data) {
        currentData = JSON.parse(Buffer.from(data.content, 'base64').toString());
        sha = data.sha;
      }
    } catch { }

    currentData[discordId] = { token, tier, expires_at: expiresAt, claimed_at: new Date().toISOString() };

    await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
      path: filePath,
      message: `chore: claim token for ${discordId}`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      sha,
    });
  } catch (err) {
    console.error('[claim-token] Gagal sync claim.json:', err);
  }
}

async function sendWebhookNotif(username: string, tier: string, expiresAt: string) {
  if (!process.env.DISCORD_WEBHOOK_CLAIM) return;
  try {
    await fetch(process.env.DISCORD_WEBHOOK_CLAIM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🎫 Token Diklaim',
          color: tier === 'VIP' ? 0xFFD700 : 0x22C55E,
          description: `**${username}** berhasil claim token **${tier}**`,
          fields: [{ name: 'Berlaku hingga', value: new Date(expiresAt).toLocaleString('id-ID'), inline: true }],
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch { }
}

async function fetchClaimsWithCache(githubToken: string, owner: string, repo: string, filePath: string) {
  const now = Date.now();
  if (claimsCache && now < claimsCache.expiresAt) return claimsCache.data;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghRes = await fetch(url, {
    headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
    cache: 'no-store',
  });

  if (!ghRes.ok) throw new Error(`GitHub API Error: ${ghRes.status}`);
  const ghData = await ghRes.json();
  const content = Buffer.from(ghData.content as string, 'base64').toString('utf-8');
  const json = JSON.parse(content);

  claimsCache = { data: json, expiresAt: now + CACHE_TTL_MS };
  return json;
}

// ─── ACTION: CLAIM-TOKEN ──────────────────────────────────────────────────────
async function handleClaimToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan' });

  try {
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

    if (!hasInnerCircle(guild_roles)) {
      return res.status(403).json({
        error: 'Role tidak memenuhi syarat',
        message: 'Hanya member dengan role Inner Circle yang bisa claim token gratis',
      });
    }

    const tier = detectTier(guild_roles);

    const { data: lastClaim } = await supabaseAdmin
      .from('token_claims')
      .select('claimed_at, tier')
      .eq('discord_id', discord_id)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastClaim) {
      const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const lastClaimedAt = new Date(lastClaim.claimed_at).getTime();
      const nextClaimAt = new Date(lastClaimedAt + cooldownMs);
      const now = new Date();

      if (now < nextClaimAt) {
        const diff = nextClaimAt.getTime() - now.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const days = Math.floor(diff / (24 * 3600000));
        return res.status(429).json({
          error: 'Cooldown belum selesai',
          next_claim: nextClaimAt.toISOString(),
          wait: days > 0 ? `${days} hari ${hours % 24}j` : `${hours}j ${minutes}m`,
        });
      }
    }

    const token = generateToken(24);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_DURATION_DAYS[tier] * 24 * 60 * 60 * 1000);

    const { error: insertErr } = await supabaseAdmin.from('token_claims').insert({
      discord_id,
      claimed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      token,
      tier,
      duration_days: TOKEN_DURATION_DAYS[tier],
    });

    if (insertErr) throw insertErr;

    syncClaimJson(discord_id, token, tier, expiresAt.toISOString());
    sendWebhookNotif(username, tier, expiresAt.toISOString());

    return res.status(200).json({
      success: true,
      token,
      tier,
      expires_at: expiresAt.toISOString(),
      duration: TOKEN_DURATION_DAYS[tier],
      message: `Token ${tier} berhasil diklaim! Berlaku ${TOKEN_DURATION_DAYS[tier]} hari.`,
    });
  } catch (err: any) {
    console.error('[claim-token]', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}

// ─── ACTION: DOWNLOADS ────────────────────────────────────────────────────────
async function handleDownloads(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const { data: histData } = await supabaseAdmin
      .from('download_history')
      .select('mod_id, created_at')
      .eq('discord_id', session.discord_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!histData || histData.length === 0) return res.status(200).json([]);

    const modIds = histData.map(h => h.mod_id).filter(Boolean);
    const { data: modsData } = await supabaseAdmin
      .from('mods')
      .select('id, title, category, created_at')
      .in('id', modIds);

    if (!modsData) return res.status(200).json([]);

    const modsMap = new Map(modsData.map(m => [m.id, m]));
    const result = modIds
      .map(id => modsMap.get(id))
      .filter((mod): mod is NonNullable<typeof mod> => mod !== undefined) // ✅ FIX: Type guard
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

// ─── ACTION: TOKENS ───────────────────────────────────────────────────────────
async function handleTokens(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const { data: tokens } = await supabaseAdmin
      .from('token_claims')
      .select('*')
      .eq('discord_id', session.discord_id)
      .order('claimed_at', { ascending: false })
      .limit(10);

    if (!tokens || tokens.length === 0) return res.status(200).json([]);

    const result = tokens.map(t => ({
      token: t.token,
      tier: t.tier,
      expiry_timestamp: t.expires_at,
      source_alias: t.tier.toLowerCase(),
      hwid: null,
      claimed_at: t.claimed_at,
    }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[tokens]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── ACTION: CLAIM (GitHub fetch) ─────────────────────────────────────────────
async function handleClaim(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const repoString = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const filePath = process.env.CLAIMS_FILE || 'claims.json';
  const [owner, repo] = repoString.split('/');

  if (!githubToken || !owner || !repo) {
    return res.status(500).json({ message: 'Server configuration error: Missing GitHub Env' });
  }

  try {
    const json = await fetchClaimsWithCache(githubToken, owner, repo, filePath);
    const userData = json[userId];

    if (!userData) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.status(404).json({ message: 'License not found' });
    }

    interface TokenEntry {
      token: string;
      expiry_timestamp: string | null;
      source_alias: string;
      hwid: string | null;
    }

    let allTokens: TokenEntry[] = [];

    if (Array.isArray(userData.tokens) && userData.tokens.length > 0) {
      allTokens = userData.tokens.map((t: any) => ({
        token: t.token || '',
        expiry_timestamp: t.expiry_timestamp || userData.token_expiry_timestamp || null,
        source_alias: t.source_alias || userData.source_alias || 'user',
        hwid: t.hwid ?? userData.hwid ?? null,
      }));
    } else if (userData.current_token) {
      allTokens = [{
        token: userData.current_token,
        expiry_timestamp: userData.token_expiry_timestamp || userData.expiry_timestamp || null,
        source_alias: userData.source_alias || 'user',
        hwid: userData.hwid ?? null,
      }];
    }

    const currentToken = userData.current_token || '';
    const tokensWithActive = allTokens.map(t => ({
      ...t,
      is_current: t.token === currentToken,
    }));

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.status(200).json({
      tokens: tokensWithActive,
      current_token: currentToken,
      hwid: userData.hwid ?? null,
    });
  } catch (error) {
    console.error('[CLAIM_API_ERROR]', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ message: 'Failed to fetch license data' });
  }
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action } = req.query;

  switch (action) {
    case 'claim-token': return handleClaimToken(req, res);
    case 'downloads':   return handleDownloads(req, res);
    case 'tokens':      return handleTokens(req, res);
    case 'claim':       return handleClaim(req, res);
    default:            return res.status(400).json({ error: 'Invalid action' });
  }
}