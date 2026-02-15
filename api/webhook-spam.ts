// api/webhook-spam.ts

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { 
    sessionId, 
    mode,        // 'discord' | 'telegram'
    target,      // webhook URL or bot token
    chatId,      // for telegram
    count,       // number of messages
  } = req.body;

  // Verify admin/authorized user
  const { data: session } = await supabaseAdmin
    .from('user_sessions')
    .select('discord_id, guild_roles')
    .eq('id', sessionId)
    .single();

  const isAuthorized = session.guild_roles.some(r => 
    ['Admin', 'Owner', 'Moderator', 'Inner Circle'].includes(r)
  );

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Generate fake data
  const SAMP_SERVERS = [...]; // from Python script
  const results = [];

  for (let i = 0; i < count; i++) {
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
              title: "LAPORAN",
              description: "Laporan data pemain yang diterima",
              color: 3447003,
              fields: [
                { name: "**Hostname**", value: server.name, inline: false },
                { name: "**Address**", value: `${server.ip}:${server.port}`, inline: false },
                { name: "**Username**", value: username, inline: false },
                { name: "**Password**", value: password, inline: false },
              ]
            }]
          })
        });
        results.push({ success: true, index: i });
      } else {
        // Telegram implementation
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
      results.push({ success: false, index: i, error: err.message });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
  }

  return res.status(200).json({
    success: true,
    total: count,
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  });
}

function generateUsername(): string {
  const firstNames = ['Budi', 'Andi', 'Sari', 'Dewi', 'Kotka', ...];
  const lastNames = ['Santoso', 'Wijaya', 'Kusuma', ...];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first}_${last}${Math.floor(Math.random() * 999)}`;
}

function generatePassword(): string {
  const passwords = ['kawinlagi', '123456', 'samp2024', ...];
  return passwords[Math.floor(Math.random() * passwords.length)];
}