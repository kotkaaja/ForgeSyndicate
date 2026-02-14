// api/user/claim.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS biar bisa dipanggil dari frontend local/prod
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // 1. Ambil config dari .env.local / Environment Variables Vercel
  const token = process.env.GITHUB_TOKEN;
  const repoString = process.env.CLAIMS_REPO || 'delonRp/BotDicordtk'; // Fallback kalau env kosong
  const filePath = process.env.CLAIMS_FILE || 'claims.json';

  const [owner, repo] = repoString.split('/');

  if (!token || !owner || !repo) {
    return res.status(500).json({ message: 'Server configuration error: Missing GitHub Env' });
  }

  try {
    // 2. Fetch file dari GitHub API
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    const ghRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      cache: 'no-store'
    });

    if (!ghRes.ok) {
      if (ghRes.status === 404) console.error("File claims.json gak ketemu!");
      throw new Error(`GitHub API Error: ${ghRes.status}`);
    }

    const ghData = await ghRes.json();
    
    // 3. Decode Content (base64 -> utf8)
    const content = Buffer.from(ghData.content as string, 'base64').toString('utf-8');
    const json = JSON.parse(content);

    // 4. Cari User Data
    const userData = json[userId];

    if (!userData) {
      return res.status(404).json({ message: 'License not found' });
    }

    // 5. Return data bersih
    return res.status(200).json({
      token: userData.current_token,
      expiry: userData.expiry_timestamp,
      type: userData.source_alias || 'User',
      hwid: userData.hwid
    });

  } catch (error) {
    console.error('[CLAIM_API_ERROR]', error);
    return res.status(500).json({ message: 'Failed to fetch license data' });
  }
}