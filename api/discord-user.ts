import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing user id' });
  }

  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Discord bot token not configured' });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
      },
    });

    if (!response.ok) {
      return res.status(200).json({ username: null, avatar: null });
    }

    const user: any = await response.json();

    // Build avatar URL
    let avatarUrl: string | null = null;
    if (user.avatar) {
      const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=128`;
    } else {
      // Default Discord avatar berdasarkan discriminator / user id
      const defaultIdx = (BigInt(id) >> 22n) % 6n;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIdx}.png`;
    }

    return res.status(200).json({
      username: user.global_name || user.username || null,
      avatar:   avatarUrl,
    });

  } catch (error) {
    console.error('Discord API error:', error);
    return res.status(200).json({ username: null, avatar: null });
  }
}