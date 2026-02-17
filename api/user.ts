// api/user.ts - COMPLETE VERSION: Token claim sync to GitHub claims.json
// Features:
// 1. Claim token gratis (Inner Circle) → simpan ke claims.json
// 2. Downloads history
// 3. Tokens list from Supabase
// 4. Claim data from GitHub claims.json
// 5. Webhook notifications
// 6. Cache untuk performa

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
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

function generateToken(length = 24): string {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function hasInnerCircle(roles: string[]): boolean {
  return roles.some(r => r.toLowerCase() === INNER_CIRCLE_ROLE);
}

// ─── GITHUB OPERATIONS ────────────────────────────────────────────────────────

async function getClaimsFile() {
  const githubToken = process.env.GITHUB_TOKEN;
  const repoString  = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const [owner, repo] = repoString.split('/');
  if (!githubToken || !owner || !repo) return null;
  
  const octokit = new Octokit({ auth: githubToken });
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'claims.json' });
    if ('content' in data) {
      return { 
        octokit, 
        owner, 
        repo, 
        sha: data.sha, 
        content: JSON.parse(Buffer.from(data.content, 'base64').toString()) 
      };
    }
  } catch (err: any) {
    if (err.status === 404) {
      console.log('[getClaimsFile] claims.json not found, will create new');
      return { octokit, owner, repo, sha: undefined, content: {} };
    }
    console.error('[getClaimsFile] Error:', err);
  }
  return null;
}

async function saveClaimsFile(
  octokit: Octokit, 
  owner: string, 
  repo: string, 
  sha: string | undefined, 
  content: any, 
  message: string
) {
  try {
    const result = await octokit.repos.createOrUpdateFileContents({
      owner, 
      repo, 
      path: 'claims.json', 
      message,
      content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'), 
      sha,
    });
    
    console.log('[saveClaimsFile] ✅ SUCCESS:', {
      message,
      sha: result.data.content?.sha
    });
    
    // Invalidate cache
    claimsCache = null;
    
    return true;
  } catch (err: any) {
    console.error('[saveClaimsFile] ❌ FAILED:', {
      error: err.message,
      status: err.status,
      response: err.response?.data
    });
    return false;
  }
}

// ─── SYNC MULTIPLE TOKENS TO claims.json ───────────────────────────────────────
async function syncClaimJsonMultiple(
  discordId: string,
  username: string,
  tokens: Array<{ token: string; tier: string; expiresAt: string }>
): Promise<boolean> {
  const file = await getClaimsFile();
  if (!file) {
    console.error('[syncClaimJson] Cannot access GitHub');
    return false;
  }

  const { octokit, owner, repo, sha, content } = file;
  const now = new Date().toISOString();

  // Build tokens array format sesuai token.py
  const tokenEntries = tokens.map(t => ({
    token:            t.token,
    expiry_timestamp: t.expiresAt,
    source_alias:     t.tier.toLowerCase(),
    hwid:             null,
    claimed_at:       now,
  }));

  // Merge dengan tokens yang sudah ada (jika ada)
  const existingData = content[discordId] || {};
  const existingTokens = Array.isArray(existingData.tokens) ? existingData.tokens : [];
  
  // Filter expired tokens
  const validExistingTokens = existingTokens.filter((t: any) => {
    if (!t.expiry_timestamp) return false;
    return new Date(t.expiry_timestamp) > new Date();
  });

  // Combine tokens
  const allTokens = [...validExistingTokens, ...tokenEntries];

  // Prioritas VIP token sebagai current
  const vipToken = tokens.find(t => t.tier === 'VIP');
  const basicToken = tokens.find(t => t.tier === 'BASIC');
  const currentToken = vipToken?.token || basicToken?.token || allTokens[allTokens.length - 1]?.token || '';

  // Update user data dengan struktur lengkap seperti token.py
  content[discordId] = {
    ...existingData,
    tokens: allTokens,
    current_token: currentToken,
    token_expiry_timestamp: vipToken?.expiresAt || basicToken?.expiresAt || '',
    expiry_timestamp: vipToken?.expiresAt || basicToken?.expiresAt || '', // compatibility
    source_alias: vipToken ? 'vip' : 'basic',
    hwid: existingData.hwid || null,
    last_claim_timestamp: now,
    last_claim: now, // compatibility dengan bot
  };

  const success = await saveClaimsFile(
    octokit, 
    owner, 
    repo, 
    sha, 
    content, 
    `chore: claim tokens for ${username} (${discordId}) - ${tokens.map(t => t.tier).join('+')}`
  );

  return success;
}

// ─── WEBHOOK NOTIFICATION ─────────────────────────────────────────────────────
async function sendWebhookNotif(
  username: string,
  discordId: string,
  avatarUrl: string | null | undefined,
  tokens: Array<{ token: string; tier: string; expiresAt: string; duration_days: number }>
) {
  // Support dua nama env var: DISCORD_WEBHOOK_CLAIM atau DISCORD_WEBHOOK_URL
  const webhookUrl = process.env.DISCORD_WEBHOOK_CLAIM || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[webhook] ⚠️ Tidak ada DISCORD_WEBHOOK_CLAIM atau DISCORD_WEBHOOK_URL di env, skip notif');
    return;
  }

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
          {
            name:   '👤 User',
            value:  `**${username}**\n\`${discordId}\``,
            inline: true,
          },
          {
            name:   '📦 Jumlah Token',
            value:  `**${tokens.length}** token`,
            inline: true,
          },
          {
            name:   '🏅 Tier',
            value:  tokens.map(t => t.tier === 'VIP' ? '👑 VIP' : '🛡️ BASIC').join(' + '),
            inline: true,
          },
          ...fields,
        ],
        thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
        footer:    { text: 'SA Forge — Inner Circle Claim System' },
        timestamp: new Date().toISOString(),
      }],
    };

    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[webhook] ❌ Discord returned error:', res.status, text);
    } else {
      console.log('[webhook] ✅ Notification sent for', username);
    }
  } catch (err) {
    console.error('[webhook] ❌ Failed to send:', err);
  }
}

// ─── CACHE HELPER ─────────────────────────────────────────────────────────────
async function fetchClaimsWithCache(githubToken: string, owner: string, repo: string, filePath: string) {
  const now = Date.now();
  
  // Return cached data if still valid
  if (claimsCache && now < claimsCache.expiresAt) {
    console.log('[fetchClaimsWithCache] Using cached data');
    return claimsCache.data;
  }

  console.log('[fetchClaimsWithCache] Fetching fresh data from GitHub');
  
  const ghRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: { 
        'Authorization': `Bearer ${githubToken}`, 
        'Accept': 'application/vnd.github.v3+json' 
      },
      cache: 'no-store',
    }
  );
  
  if (!ghRes.ok) throw new Error(`GitHub API Error: ${ghRes.status}`);
  
  const ghData  = await ghRes.json();
  const content = Buffer.from(ghData.content as string, 'base64').toString('utf-8');
  const json    = JSON.parse(content);

  // Update cache
  claimsCache = { data: json, expiresAt: now + CACHE_TTL_MS };
  
  return json;
}

// ─── SESSION HELPER ───────────────────────────────────────────────────────────
async function getSessionUser(sessionId: string) {
  const { data: session, error } = await supabaseAdmin
    .from('user_sessions')
    .select('discord_id, username, guild_roles, tier, avatar_url, expiry')
    .eq('id', sessionId)
    .single();

  if (error || !session) return null;
  return session;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: CLAIM-TOKEN (Inner Circle) - Simpan ke claims.json
// ══════════════════════════════════════════════════════════════════════════════
async function handleClaimToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan' });

  try {
    const session = await getSessionUser(sessionId);
    if (!session) {
      return res.status(401).json({ 
        error: 'Session tidak valid, silakan login ulang' 
      });
    }

    const { discord_id, username, guild_roles = [], avatar_url } = session;

    // Check Inner Circle role
    if (!hasInnerCircle(guild_roles)) {
      return res.status(403).json({
        error:   'Role tidak memenuhi syarat',
        message: 'Hanya member dengan role Inner Circle yang bisa claim token gratis',
      });
    }

    // ── Check cooldown dari claims.json ────────────────────────────────────
    const file = await getClaimsFile();
    if (file) {
      const userData = file.content[discord_id];
      if (userData && userData.last_claim_timestamp) {
        const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        const lastClaimedAt = new Date(userData.last_claim_timestamp).getTime();
        const nextClaimAt = new Date(lastClaimedAt + cooldownMs);
        const now = new Date();

        if (now < nextClaimAt) {
          const diff = nextClaimAt.getTime() - now.getTime();
          const days = Math.floor(diff / (24 * 3600000));
          const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
          const minutes = Math.floor((diff % 3600000) / 60000);
          
          return res.status(429).json({
            error: 'Cooldown belum selesai',
            next_claim: nextClaimAt.toISOString(),
            wait: days > 0 ? `${days} hari ${hours}j` : `${hours}j ${minutes}m`,
          });
        }
      }
    }

    // ── Generate 2 token sekaligus (BASIC 7d + VIP 1d) ────────────────────
    const now = new Date();
    const granted = TOKEN_GRANTS.map(g => {
      const token = generateToken(24);
      const expiresAt = new Date(now.getTime() + g.duration_days * 24 * 60 * 60 * 1000);
      return {
        token,
        tier: g.tier,
        duration_days: g.duration_days,
        expiresAt: expiresAt.toISOString(),
      };
    });

    // ── Simpan ke Supabase token_claims (backup) ──────────────────────────
    const insertRows = granted.map(g => ({
      discord_id,
      claimed_at: now.toISOString(),
      expires_at: g.expiresAt,
      token: g.token,
      tier: g.tier,
      duration_days: g.duration_days,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from('token_claims')
      .insert(insertRows);
    
    if (insertErr) {
      console.error('[claim-token] Supabase insert error:', insertErr);
      // Don't throw, continue to GitHub sync
    }

    // ── Update user_sessions tier ke VIP ─────────────────────────────────
    const vipGrant = granted.find(g => g.tier === 'VIP');
    if (vipGrant) {
      await supabaseAdmin
        .from('user_sessions')
        .update({ 
          tier: 'VIP', 
          expiry: vipGrant.expiresAt 
        })
        .eq('discord_id', discord_id);
    }

    // ── SYNC KE GITHUB claims.json (PRIMARY STORAGE) ───────────────────────
    const syncSuccess = await syncClaimJsonMultiple(
      discord_id, 
      username,
      granted.map(g => ({
        token: g.token,
        tier: g.tier,
        expiresAt: g.expiresAt,
      }))
    );

    // ── Send webhook notification ─────────────────────────────────────────
    // Await langsung (non-blocking karena sudah response di bawah)
    // Gunakan try/catch sendiri agar tidak memblokir response
    try {
      await sendWebhookNotif(
        username,
        discord_id,
        avatar_url,
        granted.map(g => ({
          token:         g.token,
          tier:          g.tier,
          expiresAt:     g.expiresAt,
          duration_days: g.duration_days,
        }))
      );
    } catch (webhookErr) {
      // Jangan throw — webhook error tidak boleh gagalkan claim
      console.error('[webhook] Error saat kirim notif:', webhookErr);
    }

    return res.status(200).json({
      success: true,
      synced: syncSuccess,
      tokens: granted.map(g => ({
        token: g.token,
        tier: g.tier,
        expires_at: g.expiresAt,
        duration: `${g.duration_days} hari`,
      })),
      message: syncSuccess 
        ? `✅ Berhasil claim ${granted.length} token! Token tersimpan di claims.json` 
        : `⚠️ Token diklaim tapi gagal sync ke GitHub (cek env variables)`,
    });

  } catch (err: any) {
    console.error('[claim-token] Error:', err);
    return res.status(500).json({ 
      error: 'Server error: ' + err.message 
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: DOWNLOADS - Get user download history
// ══════════════════════════════════════════════════════════════════════════════
async function handleDownloads(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    const session = await getSessionUser(sessionId);
    if (!session) {
      return res.status(401).json({ 
        error: 'Session tidak valid, silakan login ulang' 
      });
    }

    // Get download history
    const { data: histData, error: histError } = await supabaseAdmin
      .from('download_history')
      .select('mod_id, created_at')
      .eq('discord_id', session.discord_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (histError) throw histError;
    if (!histData || histData.length === 0) {
      return res.status(200).json([]);
    }

    // Get mod details
    const modIds = histData.map((h: any) => h.mod_id).filter(Boolean);
    const { data: modsData, error: modsError } = await supabaseAdmin
      .from('mods')
      .select('id, title, category, image_url, created_at')
      .in('id', modIds);

    if (modsError) throw modsError;
    if (!modsData) return res.status(200).json([]);

    // Map and return
    const modsMap = new Map(modsData.map((m: any) => [m.id, m]));
    const result = modIds
      .map((id: string) => modsMap.get(id))
      .filter((mod: any): mod is NonNullable<typeof mod> => mod !== undefined)
      .map((mod: any) => ({
        id: mod.id,
        title: mod.title,
        category: mod.category,
        imageUrl: mod.image_url,
        created_at: mod.created_at,
      }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[downloads] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: TOKENS - Get user tokens from Supabase
// ══════════════════════════════════════════════════════════════════════════════
async function handleTokens(req: VercelRequest, res: VercelResponse) {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    const session = await getSessionUser(sessionId);
    if (!session) {
      return res.status(401).json({ 
        error: 'Session tidak valid, silakan login ulang' 
      });
    }

    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('token_claims')
      .select('*')
      .eq('discord_id', session.discord_id)
      .order('claimed_at', { ascending: false })
      .limit(10);

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      return res.status(200).json([]);
    }

    const result = tokens.map((t: any) => ({
      token: t.token,
      tier: t.tier,
      expiry_timestamp: t.expires_at,
      source_alias: t.tier.toLowerCase(),
      hwid: null,
      claimed_at: t.claimed_at,
    }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[tokens] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTION: CLAIM - Get user claim data from GitHub claims.json
// ══════════════════════════════════════════════════════════════════════════════
async function handleClaim(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const repoString = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const filePath = 'claims.json';
  const [owner, repo] = repoString.split('/');

  if (!githubToken || !owner || !repo) {
    return res.status(500).json({ 
      message: 'Server configuration error: Missing GitHub Env' 
    });
  }

  try {
    // Fetch with cache
    const json = await fetchClaimsWithCache(githubToken, owner, repo, filePath);
    const userData = json[userId];

    if (!userData) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.status(404).json({ message: 'License not found' });
    }

    // Parse tokens
    interface TokenEntry {
      token: string;
      expiry_timestamp: string | null;
      source_alias: string;
      hwid: string | null;
    }

    let allTokens: TokenEntry[] = [];

    // Parse dari array tokens (format baru)
    if (Array.isArray(userData.tokens) && userData.tokens.length > 0) {
      allTokens = userData.tokens.map((t: any) => ({
        token: t.token || '',
        expiry_timestamp: t.expiry_timestamp || userData.token_expiry_timestamp || null,
        source_alias: t.source_alias || userData.source_alias || 'user',
        hwid: t.hwid ?? userData.hwid ?? null,
      }));
    } 
    // Fallback: parse dari current_token (format lama)
    else if (userData.current_token) {
      allTokens = [{
        token: userData.current_token,
        expiry_timestamp: userData.token_expiry_timestamp || userData.expiry_timestamp || null,
        source_alias: userData.source_alias || 'user',
        hwid: userData.hwid ?? null,
      }];
    }

    // Mark current token
    const currentToken = userData.current_token || '';
    const tokensWithActive = allTokens.map(t => ({
      ...t,
      is_current: t.token === currentToken,
    }));

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return res.status(200).json({
      tokens: tokensWithActive,
      current_token: currentToken,
      hwid: userData.hwid ?? null,
      last_claim_timestamp: userData.last_claim_timestamp || userData.last_claim || null,
    });
  } catch (error: any) {
    console.error('[CLAIM_API_ERROR]', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ 
      message: 'Failed to fetch license data',
      error: error.message 
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
      error: 'Internal server error',
      message: err.message 
    });
  }
}