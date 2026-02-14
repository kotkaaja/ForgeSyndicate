// api/user/claim.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const repoString  = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk';
  const filePath    = process.env.CLAIMS_FILE || 'claims.json';
  const [owner, repo] = repoString.split('/');

  if (!githubToken || !owner || !repo) {
    return res.status(500).json({ message: 'Server configuration error: Missing GitHub Env' });
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const ghRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      cache: 'no-store'
    });

    if (!ghRes.ok) throw new Error(`GitHub API Error: ${ghRes.status}`);

    const ghData = await ghRes.json();
    const content = Buffer.from(ghData.content as string, 'base64').toString('utf-8');
    const json = JSON.parse(content);

    const userData = json[userId];
    if (!userData) {
      return res.status(404).json({ message: 'License not found' });
    }

    // ── Bangun daftar tokens dari array tokens[] ──────────────────────────
    // Format di claim.json bisa punya `tokens` array DAN `current_token` string
    interface TokenEntry {
      token: string;
      expiry_timestamp: string | null;
      source_alias: string;
      hwid: string | null;
      assigned_by_admin?: number | null;
    }

    let allTokens: TokenEntry[] = [];

    if (Array.isArray(userData.tokens) && userData.tokens.length > 0) {
      // Gunakan array tokens[] sebagai sumber utama
      allTokens = userData.tokens.map((t: any) => ({
        token:             t.token             || '',
        expiry_timestamp:  t.expiry_timestamp  || userData.token_expiry_timestamp || null,
        source_alias:      t.source_alias      || userData.source_alias || 'user',
        hwid:              t.hwid              ?? userData.hwid ?? null,
      }));
    } else if (userData.current_token) {
      // Fallback: tidak ada tokens[], pakai current_token saja
      allTokens = [{
        token:            userData.current_token,
        expiry_timestamp: userData.token_expiry_timestamp || userData.expiry_timestamp || null,
        source_alias:     userData.source_alias || 'user',
        hwid:             userData.hwid ?? null,
      }];
    }

    // Tandai mana yang sedang aktif (current_token)
    const currentToken = userData.current_token || '';

    const tokensWithActive = allTokens.map(t => ({
      ...t,
      is_current: t.token === currentToken,
    }));

    return res.status(200).json({
      tokens:        tokensWithActive,
      current_token: currentToken,
      hwid:          userData.hwid ?? null,
    });

  } catch (error) {
    console.error('[CLAIM_API_ERROR]', error);
    return res.status(500).json({ message: 'Failed to fetch license data' });
  }
}