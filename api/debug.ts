import type { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint debug — akses di /api/debug untuk lihat status semua config
// HAPUS FILE INI setelah selesai debug!

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const DISCORD_API = 'https://discord.com/api/v10';

  // Cek env vars (hanya tampil ada/tidak, tidak tampil nilainya)
  const envCheck = {
    DISCORD_CLIENT_ID:      !!process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET:  !!process.env.DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI:   process.env.DISCORD_REDIRECT_URI || '❌ KOSONG',
    DISCORD_BOT_TOKEN:      !!process.env.DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID:       process.env.DISCORD_GUILD_ID || '❌ KOSONG',
    GITHUB_TOKEN:           !!process.env.GITHUB_TOKEN,
    CLAIMS_REPO:            process.env.CLAIMS_REPO || '❌ KOSONG',
    VITE_SUPABASE_URL:      process.env.VITE_SUPABASE_URL || '❌ KOSONG',
    SUPABASE_SERVICE_ROLE:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    FRONTEND_URL:           process.env.FRONTEND_URL || '❌ KOSONG',
  };

  // Test Discord Bot Token — apakah valid
  let botTest: any = { ok: false, error: 'not tested' };
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const r = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });
      const d: any = await r.json();
      botTest = r.ok
        ? { ok: true, bot_username: d.username, bot_id: d.id }
        : { ok: false, error: d.message || 'invalid token', code: d.code };
    } catch (e: any) {
      botTest = { ok: false, error: e.message };
    }
  }

  // Test akses ke Guild
  let guildTest: any = { ok: false, error: 'not tested' };
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID) {
    try {
      const r = await fetch(`${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });
      const d: any = await r.json();
      guildTest = r.ok
        ? { ok: true, guild_name: d.name, member_count: d.approximate_member_count }
        : { ok: false, error: d.message || 'cannot access guild', code: d.code };
    } catch (e: any) {
      guildTest = { ok: false, error: e.message };
    }
  }

  // Test Supabase connection
  let supabaseTest: any = { ok: false, error: 'not tested' };
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const r = await fetch(
        `${process.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?select=id&limit=1`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      supabaseTest = r.ok
        ? { ok: true, status: r.status }
        : { ok: false, error: `HTTP ${r.status}`, hint: r.status === 404 ? 'Tabel user_sessions belum dibuat — jalankan SUPABASE_SETUP.sql' : '' };
    } catch (e: any) {
      supabaseTest = { ok: false, error: e.message };
    }
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    env:       envCheck,
    discord_bot:  botTest,
    discord_guild: guildTest,
    supabase:  supabaseTest,
    instructions: 'Buka URL ini di browser: https://forgelua.vercel.app/api/debug',
  });
}
