// api/user.ts - FIXED: Token claim sync to GitHub claim.json
// Perubahan:
// 1. Perbaiki sync ke GitHub dengan error handling yang lebih baik
// 2. Tambah logging untuk debugging
// 3. Pastikan format claim.json sesuai dengan token.py

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const INNER_CIRCLE_ROLE = 'inner circle';
const COOLDOWN_DAYS     = 7;

// Inner Circle selalu dapat 2 token: BASIC 7hr + VIP 1hr
const TOKEN_GRANTS = [
  { tier: 'BASIC', duration_days: 7 },
  { tier: 'VIP',   duration_days: 1 },
];

interface CacheEntry { data: Record<string, any>; expiresAt: number; }
let claimsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function generateToken(length = 24): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function hasInnerCircle(roles: string[]): boolean {
  return roles.some(r => r.toLowerCase() === INNER_CIRCLE_ROLE);
}

// ─── FIXED: Sync ke claims.json di GitHub ────────────────────────────────────
async function syncClaimJsonMultiple(
  discordId: string,
  tokens: Array<{ token: string; tier: string; expiresAt: string }>
): Promise<boolean> {
  const githubToken = process.env.GITHUB_TOKEN;
  const repoString  = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const [owner, repo] = repoString.split('/');
  
  if (!githubToken || !owner || !repo) {
    console.error('[syncClaimJson] Missing GitHub env vars:', { 
      hasToken: !!githubToken, 
      owner, 
      repo 
    });
    return false;
  }

  try {
    const octokit  = new Octokit({ auth: githubToken });
    const filePath = 'claim.json';
    let currentData: Record<string, any> = {};
    let sha: string | undefined;

    // Fetch existing file
    try {
      const { data } = await octokit.repos.getContent({ 
        owner, 
        repo, 
        path: filePath 
      });
      if ('content' in data) {
        currentData = JSON.parse(Buffer.from(data.content, 'base64').toString());
        sha = data.sha;
        console.log('[syncClaimJson] Fetched existing claim.json');
      }
    } catch (err: any) {
      if (err.status === 404) {
        console.log('[syncClaimJson] claim.json not found, will create new');
      } else {
        throw err;
      }
    }

    const now = new Date().toISOString();

    // Build tokens array format sesuai token.py
    const tokenEntries = tokens.map(t => ({
      token:            t.token,
      expiry_timestamp: t.expiresAt,
      source_alias:     t.tier.toLowerCase(),
      hwid:             null,
      claimed_at:       now,
    }));

    // Update user data
    const vipToken = tokens.find(t => t.tier === 'VIP');
    const basicToken = tokens.find(t => t.tier === 'BASIC');

    currentData[discordId] = {
      ...(currentData[discordId] || {}),
      tokens:                tokenEntries,
      current_token:         vipToken?.token || basicToken?.token || '',
      token_expiry_timestamp: vipToken?.expiresAt || basicToken?.expiresAt || '',
      expiry_timestamp:      vipToken?.expiresAt || basicToken?.expiresAt || '', // compatibility
      source_alias:          vipToken ? 'vip' : 'basic',
      hwid:                  currentData[discordId]?.hwid || null,
      last_claim:            now,
    };

    // Invalidate cache
    claimsCache = null;

    // Commit to GitHub
    const commitRes = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path:    filePath,
      message: `chore: claim tokens for ${discordId} - ${tokens.map(t => t.tier).join('+')}`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      sha,
    });

    console.log('[syncClaimJson] ✅ SUCCESS - Synced to GitHub', {
      discordId,
      tokens: tokens.map(t => `${t.tier}:${t.token.slice(0,8)}...`),
      sha: commitRes.data.content?.sha
    });

    return true;
  } catch (err: any) {
    console.error('[syncClaimJson] ❌ FAILED:', {
      error: err.message,
      status: err.status,
      response: err.response?.data
    });
    return false;
  }
}

async function sendWebhookNotif(
  username: string,
  tokens: Array<{ token: string; tier: string; expiresAt: string }>
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_CLAIM;
  if (!webhookUrl) return;

  try {
    const fields = tokens.map(t => ({
      name:   `Token ${t.tier}`,
      value:  `\`${t.token}\`\nBerlaku hingga: ${new Date(t.expiresAt).toLocaleString('id-ID')}`,
      inline: true,
    }));

    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title:       '🎫 Token Diklaim (Inner Circle)',
          color:       0xFFD700,
          description: `**${username}** berhasil claim 2 token sekaligus!`,
          fields,
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (err) {
    console.error('[webhook] Failed:', err);
  }
}

async function fetchClaimsWithCache(githubToken: string, owner: string, repo: string, filePath: string) {
  const now = Date.now();
  if (claimsCache && now < claimsCache.expiresAt) return claimsCache.data;

  const ghRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
      cache: 'no-store',
    }
  );
  if (!ghRes.ok) throw new Error(`GitHub API Error: ${ghRes.status}`);
  const ghData  = await ghRes.json();
  const content = Buffer.from(ghData.content as string, 'base64').toString('utf-8');
  const json    = JSON.parse(content);

  claimsCache = { data: json, expiresAt: now + CACHE_TTL_MS };
  return json;
}

async function getSessionUser(sessionId: string) {
  const { data: session, error } = await supabaseAdmin
    .from('user_sessions')
    .select('discord_id, username, guild_roles, tier')
    .eq('id', sessionId)
    .single();

  if (error || !session) return null;
  return session;
}

// ─── ACTION: CLAIM-TOKEN ──────────────────────────────────────────────────────
async function handleClaimToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan' });

  try {
    const session = await getSessionUser(sessionId);
    if (!session) return res.status(401).json({ error: 'Session tidak valid, silakan login ulang' });

    const { discord_id, username, guild_roles = [] } = session;

    if (!hasInnerCircle(guild_roles)) {
      return res.status(403).json({
        error:   'Role tidak memenuhi syarat',
        message: 'Hanya member dengan role Inner Circle yang bisa claim token gratis',
      });
    }

    // ── Cek cooldown dari DB ──────────────────────────────────────────────
    const { data: lastClaim } = await supabaseAdmin
      .from('token_claims')
      .select('claimed_at, tier')
      .eq('discord_id', discord_id)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastClaim) {
      const cooldownMs    = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const lastClaimedAt = new Date(lastClaim.claimed_at).getTime();
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
          wait:       days > 0 ? `${days} hari ${hours % 24}j` : `${hours}j ${minutes}m`,
        });
      }
    }

    // ── Generate 2 token sekaligus ────────────────────────────────────────
    const now     = new Date();
    const granted = TOKEN_GRANTS.map(g => {
      const token     = generateToken(24);
      const expiresAt = new Date(now.getTime() + g.duration_days * 24 * 60 * 60 * 1000);
      return {
        token,
        tier:         g.tier,
        duration_days: g.duration_days,
        expiresAt:    expiresAt.toISOString(),
      };
    });

    // ── Simpan ke Supabase token_claims ──────────────────────────────────
    const insertRows = granted.map(g => ({
      discord_id,
      claimed_at:    now.toISOString(),
      expires_at:    g.expiresAt,
      token:         g.token,
      tier:          g.tier,
      duration_days: g.duration_days,
    }));

    const { error: insertErr } = await supabaseAdmin.from('token_claims').insert(insertRows);
    if (insertErr) throw insertErr;

    // ── Update user_sessions tier ke VIP ─────────────────────────────────
    const vipGrant = granted.find(g => g.tier === 'VIP');
    if (vipGrant) {
      await supabaseAdmin
        .from('user_sessions')
        .update({ tier: 'VIP', expiry: vipGrant.expiresAt })
        .eq('discord_id', discord_id);
    }

    // ── FIXED: Sync GitHub + webhook notif ───────────────────────────────
    const syncSuccess = await syncClaimJsonMultiple(discord_id, granted.map(g => ({
      token:     g.token,
      tier:      g.tier,
      expiresAt: g.expiresAt,
    })));

    // Send webhook notification (don't block response)
    sendWebhookNotif(username, granted.map(g => ({
      token:     g.token,
      tier:      g.tier,
      expiresAt: g.expiresAt,
    }))).catch(console.error);

    return res.status(200).json({
      success:  true,
      synced:   syncSuccess,
      tokens:   granted.map(g => ({
        token:     g.token,
        tier:      g.tier,
        expires_at: g.expiresAt,
        duration:  g.duration_days,
      })),
      message: syncSuccess 
        ? `✅ Berhasil claim 2 token! Token tersimpan di claim.json` 
        : `⚠️ Token diklaim tapi gagal sync ke GitHub (cek env variables)`,
    });

  } catch (err: any) {
    console.error('[claim-token]', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}

// ... (rest of the file sama seperti sebelumnya - downloads, tokens, claim actions)

// ─── ACTION: DOWNLOADS ────────────────────────────────────────────────────────
async function handleDownloads(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string')
    return res.status(400).json({ error: 'sessionId required' });

  try {
    const session = await getSessionUser(sessionId);
    if (!session) return res.status(401).json({ error: 'Session tidak valid, silakan login ulang' });

    const { data: histData } = await supabaseAdmin
      .from('download_history')
      .select('mod_id, created_at')
      .eq('discord_id', session.discord_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!histData || histData.length === 0) return res.status(200).json([]);

    const modIds = histData.map((h: any) => h.mod_id).filter(Boolean);
    const { data: modsData } = await supabaseAdmin
      .from('mods')
      .select('id, title, category, image_url, created_at')
      .in('id', modIds);

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
    console.error('[downloads]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── ACTION: TOKENS ───────────────────────────────────────────────────────────
async function handleTokens(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string')
    return res.status(400).json({ error: 'sessionId required' });

  try {
    const session = await getSessionUser(sessionId);
    if (!session) return res.status(401).json({ error: 'Session tidak valid, silakan login ulang' });

    const { data: tokens } = await supabaseAdmin
      .from('token_claims')
      .select('*')
      .eq('discord_id', session.discord_id)
      .order('claimed_at', { ascending: false })
      .limit(10);

    if (!tokens || tokens.length === 0) return res.status(200).json([]);

    const result = tokens.map((t: any) => ({
      token:            t.token,
      tier:             t.tier,
      expiry_timestamp: t.expires_at,
      source_alias:     t.tier.toLowerCase(),
      hwid:             null,
      claimed_at:       t.claimed_at,
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
  if (!userId || typeof userId !== 'string')
    return res.status(400).json({ message: 'User ID is required' });

  const githubToken = process.env.GITHUB_TOKEN;
  const repoString  = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const filePath    = process.env.CLAIMS_FILE  || 'claim.json';
  const [owner, repo] = repoString.split('/');

  if (!githubToken || !owner || !repo)
    return res.status(500).json({ message: 'Server configuration error: Missing GitHub Env' });

  try {
    const json     = await fetchClaimsWithCache(githubToken, owner, repo, filePath);
    const userData = json[userId];

    if (!userData) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.status(404).json({ message: 'License not found' });
    }

    interface TokenEntry {
      token:            string;
      expiry_timestamp: string | null;
      source_alias:     string;
      hwid:             string | null;
    }

    let allTokens: TokenEntry[] = [];

    if (Array.isArray(userData.tokens) && userData.tokens.length > 0) {
      allTokens = userData.tokens.map((t: any) => ({
        token:            t.token || '',
        expiry_timestamp: t.expiry_timestamp || userData.token_expiry_timestamp || null,
        source_alias:     t.source_alias     || userData.source_alias || 'user',
        hwid:             t.hwid ?? userData.hwid ?? null,
      }));
    } else if (userData.current_token) {
      allTokens = [{
        token:            userData.current_token,
        expiry_timestamp: userData.token_expiry_timestamp || userData.expiry_timestamp || null,
        source_alias:     userData.source_alias || 'user',
        hwid:             userData.hwid ?? null,
      }];
    }

    const currentToken     = userData.current_token || '';
    const tokensWithActive = allTokens.map(t => ({
      ...t,
      is_current: t.token === currentToken,
    }));

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.status(200).json({
      tokens:        tokensWithActive,
      current_token: currentToken,
      hwid:          userData.hwid ?? null,
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