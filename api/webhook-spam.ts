// api/webhook-spam.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



// SA-MP Server list untuk fake data
const SAMP_SERVERS = [
  { name: 'IDGS Roleplay', ip: '103.10.68.119', port: '7777' },
  { name: 'Volcano Roleplay', ip: '202.67.40.105', port: '7777' },
  { name: 'Stargame Roleplay', ip: '103.10.68.120', port: '7777' },
  { name: 'Infinity Roleplay', ip: '103.10.68.121', port: '7777' },
  { name: 'Nightlife Roleplay', ip: '202.67.40.106', port: '7777' },
];

const FIRST_NAMES = ['Budi', 'Andi', 'Sari', 'Dewi', 'Kotka', 'Rudi', 'Joko', 'Putri', 'Rina', 'Agus'];
const LAST_NAMES = ['Santoso', 'Wijaya', 'Kusuma', 'Pratama', 'Setiawan', 'Gunawan', 'Hidayat', 'Nugroho'];
const PASSWORDS = ['kawinlagi', '123456', 'samp2024', 'password', 'admin123', 'qwerty', 'sampindo', 'roleplay'];

function generateUsername(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first}_${last}${Math.floor(Math.random() * 999)}`;
}

function generatePassword(): string {
  return PASSWORDS[Math.floor(Math.random() * PASSWORDS.length)];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, mode, target, chatId, count } = req.body;

  // Verify logged-in user (no role restriction - available for all users)
  try {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Unauthorized - Please login first' });

    // Generate fake data and spam
    const results: Array<{ success: boolean; index: number; error?: string }> = [];

    for (let i = 0; i < Math.min(count, 1000); i++) {
      const server = SAMP_SERVERS[Math.floor(Math.random() * SAMP_SERVERS.length)];
      const username = generateUsername();
      const password = generatePassword();

      try {
        if (mode === 'discord') {
          await fetch(target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '🎣 LAPORAN',
                description: 'Laporan data pemain yang diterima',
                color: 3447003,
                fields: [
                  { name: '**Hostname**', value: server.name, inline: false },
                  { name: '**Address**', value: `${server.ip}:${server.port}`, inline: false },
                  { name: '**Username**', value: username, inline: false },
                  { name: '**Password**', value: password, inline: false },
                ]
              }]
            })
          });
          results.push({ success: true, index: i });
        } else if (mode === 'telegram') {
          await fetch(`https://api.telegram.org/bot${target}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `*Keylogger Samp By ZenSamp*\n📡 *Name Server:* ${server.name}\n🌐 *IP:* ${server.ip}:${server.port}\n👤 *Username:* ${username}\n🔑 *Password:* \`${password}\``,
              parse_mode: 'Markdown'
            })
          });
          results.push({ success: true, index: i });
        }
      } catch (err) {
        const error = err as Error;
        results.push({ success: false, index: i, error: error.message });
      }

      // Rate limiting - 100ms delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return res.status(200).json({
      success: true,
      total: count,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

  } catch (err) {
    const error = err as Error;
    console.error('[webhook-spam]', error);
    return res.status(500).json({ error: error.message });
  }
}