import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const CLIENT_ID    = process.env.DISCORD_CLIENT_ID!;
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!; // https://yourdomain.com/api/auth/callback

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify guilds.members.read',
    prompt:        'none', // tidak re-prompt kalau sudah auth
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}