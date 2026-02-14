import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false, error: 'Token kosong' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER   = "delonrp";
  const REPO_NAME    = "BotDicordtk";
  const FILE_PATH    = "ini-susah.txt";      // file list token valid (lama)
  const CLAIMS_PATH  = "claims.json";        // file claims lengkap dengan profil

  if (!GITHUB_TOKEN) return res.status(500).json({ valid: false, error: 'Server Config Error' });

  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    // ── 1. Coba baca claims.json dulu (data lengkap) ──────────────────────
    let profileData: any = null;

    try {
      const claimsRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CLAIMS_PATH}`,
        { headers }
      );

      if (claimsRes.ok) {
        const claimsJson: any = await claimsRes.json();
        const claims = JSON.parse(Buffer.from(claimsJson.content, 'base64').toString('utf-8'));

        // Cari token di claims
        for (const [userId, userData] of Object.entries(claims) as any[]) {
          let matchedTokenData: any = null;

          // Cek current_token
          if (userData.current_token === token.trim()) {
            matchedTokenData = userData;
          }

          // Cek array tokens
          if (!matchedTokenData && Array.isArray(userData.tokens)) {
            const found = userData.tokens.find((t: any) => t.token === token.trim());
            if (found) matchedTokenData = found;
          }

          if (matchedTokenData) {
            const expiry = matchedTokenData.expiry_timestamp
              || matchedTokenData.token_expiry_timestamp
              || userData.expiry_timestamp
              || null;

            const role = (matchedTokenData.source_alias || userData.source_alias || 'vip').toLowerCase();

            // Cek expired
            if (expiry && new Date().toISOString() > expiry) {
              return res.status(200).json({ valid: false, error: 'Token expired', expired: true });
            }

            profileData = {
              valid:      true,
              userId:     userId,               // Discord User ID
              role:       role,                 // vip / bassic / dll
              expiry:     expiry,
              token:      token.trim(),
            };
            break;
          }
        }
      }
    } catch (e) {
      console.log('[VALIDATE] claims.json tidak ditemukan, fallback ke list token');
    }

    // ── 2. Fallback: cek di file token list lama (ini-susah.txt) ─────────
    if (!profileData) {
      const listRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
        { headers }
      );

      if (!listRes.ok) return res.status(500).json({ valid: false, error: 'Gagal akses database' });

      const listJson: any = await listRes.json();
      const fileContent = Buffer.from(listJson.content, 'base64').toString('utf-8');

      if (!fileContent.includes(token.trim())) {
        return res.status(200).json({ valid: false });
      }

      // Token valid tapi tidak ada data profil
      profileData = {
        valid:  true,
        userId: null,
        role:   'vip',
        expiry: null,
        token:  token.trim(),
      };
    }

    return res.status(200).json(profileData);

  } catch (error) {
    console.error('Internal Error:', error);
    return res.status(500).json({ valid: false, error: 'Internal Server Error' });
  }
}