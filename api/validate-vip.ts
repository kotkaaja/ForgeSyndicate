import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Setup CORS biar aman (Wajib di Vercel)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle Preflight Request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Cek Method & Input
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token kosong' });
  }

  // 3. Config GitHub
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = "delonrp";
  const REPO_NAME = "tgs.sh";
  const FILE_PATH = "ini-susah.txt";

  if (!GITHUB_TOKEN) {
    console.error("❌ GITHUB_TOKEN belum diset di Environment Variables Vercel!");
    return res.status(500).json({ valid: false, error: 'Server Config Error' });
  }

  try {
    // 4. Tembak GitHub API
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      console.error(`GitHub API Error: ${response.status}`);
      return res.status(500).json({ valid: false, error: 'Gagal akses database token' });
    }

    const data: any = await response.json();
    
    // Decode Base64 content dari GitHub
    const fileContent = Buffer.from(data.content, 'base64').toString('utf-8');

    // 5. Validasi
    if (fileContent.includes(token)) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({ valid: false });
    }

  } catch (error) {
    console.error("Internal Error:", error);
    return res.status(500).json({ valid: false, error: 'Internal Server Error' });
  }
}