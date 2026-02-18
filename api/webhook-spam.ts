import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- DATABASE DATA PALSU (Sama persis dengan versi Python) ---
const SAMP_SERVERS = [
  { name: "404 Roleplay | Indonesia Comeback",        ip: "204.10.193.154",  port: "7777"},
  { name: "Central State Roleplay | Indonesia",       ip: "45.127.35.210",   port: "7777"},
  { name: "Noir District | OneForAll | NoMpruy",      ip: "104.234.180.104", port: "7777"},
  { name: "Lost Paradise Roleplay | StayChatOnly",    ip: "51.254.139.153",  port: "7777"},
  { name: "Relative Roleplay | Make History!",        ip: "104.234.180.194", port: "7777"},
  { name: "Mayday Roleplay | #KEMBALIKERUMAH",        ip: "204.10.193.106",  port: "7777"},
  { name: "Mandalika Roleplay | Make Your Story!",    ip: "104.234.180.57",  port: "7777"},
  { name: "Warga Indonesia | #KotaDamai",             ip: "104.234.180.233", port: "7777"},
  { name: "State Side Roleplay",                      ip: "104.234.180.192", port: "7777"},
  { name: "Crystal Pride Roleplay",                   ip: "31.58.143.35",    port: "7777"},
];

const FIRST_NAMES = [
    "Budi","Andi","Sari","Dewi","Rudi","Agus","Hendra","Wahyu","Rizky","Fajar",
    "Dimas","Yoga","Bagas","Gilang","Reza","Faisal","Arief","Teguh","Iwan","Bambang",
    "Surya","Heri","Anton","Joko","Putri","Siti","Ani","Nurul","Indah","Ayu"
];
const LAST_NAMES = [
    "Santoso","Wijaya","Kusuma","Pratama","Setiawan","Rahayu","Hidayat",
    "Nugroho","Saputra","Wibowo","Prayogo","Hermawan","Susanto","Gunawan"
];
const COMMON_PASSWORDS = [
    "kawinlagi","123456","password","sandi123","gaming123","samp2024","roleplay",
    "kerenan","bagusok","mantap","ganteng","cantik","gesrek","ampas","cobacoba",
    "rumahku","bismillah","indonesia","jakarta123","bandung99","surabaya01",
];

// --- GENERATOR ---
function generateUsername(): string {
  const style = Math.floor(Math.random() * 5);
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  
  if (style === 0) return `${first}_${last}`;
  if (style === 1) return `${first}${Math.floor(Math.random() * 999)}`;
  if (style === 2) return `${first.toLowerCase()}.${last.toLowerCase()}`;
  if (style === 3) return `${first}${last.substring(0,3)}${Math.floor(Math.random() * 99)}`;
  return `${first.toLowerCase()}${Math.floor(Math.random() * 9999)}`;
}

function generatePassword(): string {
  if (Math.random() > 0.5) return COMMON_PASSWORDS[Math.floor(Math.random() * COMMON_PASSWORDS.length)];
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  return `${first.toLowerCase()}${Math.floor(Math.random() * 2000)}`;
}

// --- HANDLER UTAMA ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, mode, target, chatId, token } = req.body;

  // 1. SCAN TELEGRAM: Mencari Chat ID secara otomatis
  if (action === 'scan_telegram') {
    if (!token) return res.status(400).json({ error: 'Token wajib diisi' });
    try {
      // Panggil getUpdates telegram
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const data = await response.json();
      
      if (!data.ok) {
        if (data.error_code === 401) return res.status(401).json({ error: 'Token Bot Invalid/Hangus' });
        return res.status(400).json({ error: `Telegram Error: ${data.description}` });
      }

      // Filter Chat ID yang unik
      const seen = new Set();
      const chats = [];
      for (const update of data.result) {
        // Cek semua kemungkinan tipe update (message, channel_post, my_chat_member)
        const msg = update.message || update.channel_post || update.my_chat_member || update.chat_member;
        if (!msg) continue;
        const chat = msg.chat || msg.sender_chat;
        if (chat && chat.id && !seen.has(chat.id)) {
          seen.add(chat.id);
          chats.push({
            id: chat.id,
            title: chat.title || chat.username || chat.first_name || `ID: ${chat.id}`,
            type: chat.type
          });
        }
      }
      return res.status(200).json({ success: true, chats });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // 2. EKSEKUSI SPAM (Satu per satu request)
  if (action === 'execute') {
    const sv = SAMP_SERVERS[Math.floor(Math.random() * SAMP_SERVERS.length)];
    const username = generateUsername();
    const password = generatePassword();

    try {
      let apiRes;
      
      if (mode === 'discord') {
        apiRes = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: "LAPORAN",
              description: "Laporan data pemain yang diterima",
              color: 3447003,
              fields: [
                { name: "**Hostname**", value: sv.name, inline: false },
                { name: "**Address**",  value: `${sv.ip}:${sv.port}`, inline: false },
                { name: "**Username**", value: username, inline: false },
                { name: "**Password**", value: password, inline: false },
              ]
            }]
          })
        });
      } else if (mode === 'telegram') {
        // Target di sini adalah Token
        apiRes = await fetch(`https://api.telegram.org/bot${target}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `*Keylogger Samp By ZenSamp*\n\U0001f4e1 *Name Server:* ${sv.name}\n\U0001f310 *IP Address:* ${sv.ip}:${sv.port}\n\U0001f464 *Username:* ${username}\n\U0001f511 *Password:* \`${password}\``,
            parse_mode: 'Markdown'
          })
        });
      }

      // Analisa Response Code
      if (apiRes) {
        // Sukses
        if (apiRes.status >= 200 && apiRes.status < 300) {
          return res.status(200).json({ success: true });
        }
        
        // Error Spesifik untuk deteksi "Sudah Mati"
        if (apiRes.status === 404) return res.status(404).json({ error: 'TARGET DEAD' }); // Webhook dihapus
        if (apiRes.status === 401) return res.status(401).json({ error: 'INVALID TOKEN' }); // Token salah
        if (apiRes.status === 403) return res.status(403).json({ error: 'KICKED/BLOCKED' }); // Bot dikick
        if (apiRes.status === 429) return res.status(429).json({ error: 'RATE LIMIT' }); // Terlalu cepat
        
        return res.status(apiRes.status).json({ error: `HTTP Error ${apiRes.status}` });
      }

      return res.status(500).json({ error: 'Unknown Error' });

    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  return res.status(400).json({ error: 'Action tidak valid' });
}