// api/user/claim.ts — WITH 5-MINUTE IN-MEMORY CACHE
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── In-memory cache (per Vercel instance) ────────────────────────────────
// TTL 5 menit. Vercel Functions bisa di-warm selama itu.
interface CacheEntry {
  data:      Record<string, any>;
  expiresAt: number;
}
let claimsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

async function fetchClaimsWithCache(githubToken: string, owner: string, repo: string, filePath: string) {
  const now = Date.now();

  // Cache hit?
  if (claimsCache && now < claimsCache.expiresAt) {
    return claimsCache.data;
  }

  // Cache miss → fetch dari GitHub
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghRes = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept':        'application/vnd.github.v3+json',
    },
    // Minta GitHub tidak cache (kita cache sendiri)
    cache: 'no-store',
  });

  if (!ghRes.ok) throw new Error(`GitHub API Error: ${ghRes.status}`);

  const ghData = await ghRes.json();
  const content = Buffer.from(ghData.content as string, 'base64').toString('utf-8');
  const json    = JSON.parse(content);

  // Simpan ke cache
  claimsCache = { data: json, expiresAt: now + CACHE_TTL_MS };

  return json;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const repoString  = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const filePath    = process.env.CLAIMS_FILE  || 'claims.json';
  const [owner, repo] = repoString.split('/');

  if (!githubToken || !owner || !repo) {
    return res.status(500).json({ message: 'Server configuration error: Missing GitHub Env' });
  }

  try {
    const json = await fetchClaimsWithCache(githubToken, owner, repo, filePath);

    const userData = json[userId];
    if (!userData) {
      // Set Cache-Control agar CDN tidak cache 404 terlalu lama
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.status(404).json({ message: 'License not found' });
    }

    // ── Bangun daftar tokens ──────────────────────────────────────────────
    interface TokenEntry {
      token:             string;
      expiry_timestamp:  string | null;
      source_alias:      string;
      hwid:              string | null;
    }

    let allTokens: TokenEntry[] = [];

    if (Array.isArray(userData.tokens) && userData.tokens.length > 0) {
      allTokens = userData.tokens.map((t: any) => ({
        token:            t.token             || '',
        expiry_timestamp: t.expiry_timestamp  || userData.token_expiry_timestamp || null,
        source_alias:     t.source_alias      || userData.source_alias || 'user',
        hwid:             t.hwid              ?? userData.hwid ?? null,
      }));
    } else if (userData.current_token) {
      allTokens = [{
        token:            userData.current_token,
        expiry_timestamp: userData.token_expiry_timestamp || userData.expiry_timestamp || null,
        source_alias:     userData.source_alias || 'user',
        hwid:             userData.hwid ?? null,
      }];
    }

    const currentToken = userData.current_token || '';
    const tokensWithActive = allTokens.map(t => ({
      ...t,
      is_current: t.token === currentToken,
    }));

    // Cache respons di browser/CDN selama 5 menit
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

    return res.status(200).json({
      tokens:        tokensWithActive,
      current_token: currentToken,
      hwid:          userData.hwid ?? null,
    });

  } catch (error) {
    console.error('[CLAIM_API_ERROR]', error);
    // Jangan cache error responses
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ message: 'Failed to fetch license data' });
  }
}