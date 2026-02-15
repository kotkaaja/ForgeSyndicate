// api/mod.ts
// POST /api/mod
// Body: { sessionId, title, description, category, platform, imageUrl, downloadUrl, mediaUrl, tags, version }

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ FIX: pakai VITE_SUPABASE_URL agar konsisten dengan api/auth.ts
// Kalau masih error, cek di Vercel Dashboard → Settings → Environment Variables
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL        || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES    = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];
const VERIFIED_ROLES = ['verified modder', 'verified', 'trusted modder'];
const MODDER_ROLES   = ['modder', 'script maker', 'lua modder'];

function getApprovalStatus(roles: string[]): 'official' | 'verified' | 'unofficial' | null {
  const lower = roles.map(r => r.toLowerCase());
  if (ADMIN_ROLES.some(r    => lower.includes(r))) return 'official';
  if (VERIFIED_ROLES.some(r => lower.includes(r))) return 'verified';
  if (MODDER_ROLES.some(r   => lower.includes(r))) return 'unofficial';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, ...modData } = req.body ?? {};

  if (!sessionId)          return res.status(400).json({ error: 'sessionId diperlukan' });
  if (!modData.title)      return res.status(400).json({ error: 'title wajib diisi' });
  if (!modData.description)return res.status(400).json({ error: 'description wajib diisi' });
  if (!modData.downloadUrl)return res.status(400).json({ error: 'downloadUrl wajib diisi' });

  try {
    // 1. Ambil session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles, expiry')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return res.status(401).json({ error: 'Session tidak valid atau sudah expired, silakan login ulang' });
    }

    if (session.expiry && new Date(session.expiry) < new Date()) {
      return res.status(401).json({ error: 'Session expired, silakan login ulang' });
    }

    // 2. Cek approval status dari roles
    const approvalStatus = getApprovalStatus(session.guild_roles || []);
    if (!approvalStatus) {
      return res.status(403).json({
        error:   'Tidak punya izin upload',
        message: 'Kamu butuh role Modder, Verified Modder, atau Admin untuk upload mod',
      });
    }

    // 3. Insert mod
    const { data: newMod, error: insertErr } = await supabaseAdmin
      .from('mods')
      .insert({
        title:           modData.title?.trim(),
        description:     modData.description?.trim(),
        category:        modData.category   || 'Moonloader',
        platform:        modData.platform   || 'PC',
        image_url:       modData.imageUrl   || '',
        media_url:       modData.mediaUrl   || '',
        download_url:    modData.downloadUrl,
        is_premium:      approvalStatus === 'official' ? (modData.isPremium ?? false) : false,
        author:          session.username,
        tags:            modData.tags       || [],
        uploaded_by:     session.discord_id,
        approval_status: approvalStatus,
        file_size:       modData.fileSize   || null,
        version:         modData.version    || '1.0.0',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 4. Admin log
    await supabaseAdmin.from('admin_logs').insert({
      admin_id:    session.discord_id,
      admin_name:  session.username,
      action:      'upload_mod',
      target_type: 'mod',
      target_id:   newMod.id,
      target_label: modData.title,
      metadata:    { approval_status: approvalStatus },
    });

    // 5. Webhook notif untuk unofficial (perlu review admin)
    if (approvalStatus === 'unofficial' && process.env.DISCORD_WEBHOOK_MOD_SUBMIT) {
      fetch(process.env.DISCORD_WEBHOOK_MOD_SUBMIT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title:       '📦 Mod Baru Menunggu Review',
            color:       0x6B7280,
            description: `**${modData.title}** dikirim oleh **${session.username}**`,
            fields: [
              { name: 'Kategori', value: modData.category || 'Moonloader', inline: true },
              { name: 'Status',   value: '⏳ Unofficial — perlu review',   inline: true },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {});
    }

    return res.status(200).json({
      success:         true,
      mod:             newMod,
      approval_status: approvalStatus,
      message: approvalStatus === 'unofficial'
        ? 'Mod berhasil diupload! Menunggu review dari admin.'
        : 'Mod berhasil dipublish!',
    });

  } catch (err: any) {
    console.error('[api/mod] Error:', err);
    return res.status(500).json({
      error:   'Server error saat upload mod',
      message: err?.message || 'Unknown error',
    });
  }
}