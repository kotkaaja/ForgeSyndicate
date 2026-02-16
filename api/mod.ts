// api/mod.ts — FIXED v2
// Fix: approval flow, webhook berfungsi, file size limit info

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES    = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];
const VERIFIED_ROLES = ['verified modder', 'verified', 'trusted modder'];
const MODDER_ROLES   = ['modder', 'script maker', 'lua modder'];

// Approval status yang WAJIB di-approve admin sebelum publik
type ApprovalStatus = 'official' | 'verified' | 'unofficial' | 'pending';

function getApprovalStatus(roles: string[]): ApprovalStatus | null {
  const lower = roles.map(r => r.toLowerCase());
  if (ADMIN_ROLES.some(r    => lower.includes(r))) return 'official';   // Langsung publish
  if (VERIFIED_ROLES.some(r => lower.includes(r))) return 'pending';    // Perlu approve → jadi 'verified'
  if (MODDER_ROLES.some(r   => lower.includes(r))) return 'pending';    // Perlu approve → jadi 'unofficial'
  return null;
}

// Target approval setelah di-approve (berdasarkan role)
function getTargetApprovalAfterApprove(roles: string[]): 'verified' | 'unofficial' {
  const lower = roles.map(r => r.toLowerCase());
  if (VERIFIED_ROLES.some(r => lower.includes(r))) return 'verified';
  return 'unofficial';
}

// ── Kirim webhook notif ke Discord ───────────────────────────────────────────
async function sendDiscordWebhook(webhookUrl: string, payload: object): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[webhook] Discord webhook gagal (${response.status}): ${text}`);
    }
  } catch (err) {
    console.error('[webhook] Fetch error:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, isReshare, originalAuthor, ...modData } = req.body ?? {};

  if (!sessionId)           return res.status(400).json({ error: 'sessionId diperlukan' });
  if (!modData.title)       return res.status(400).json({ error: 'title wajib diisi' });
  if (!modData.description) return res.status(400).json({ error: 'description wajib diisi' });
  if (!modData.downloadUrl) return res.status(400).json({ error: 'downloadUrl wajib diisi' });

  try {
    // 1. Validasi session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles, expiry')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return res.status(401).json({ error: 'Session tidak valid, silakan login ulang' });
    }

    // 2. Cek permission upload
    const approvalStatus = getApprovalStatus(session.guild_roles || []);
    if (!approvalStatus) {
      return res.status(403).json({
        error:   'Tidak punya izin upload',
        message: 'Kamu butuh role Modder, Verified Modder, atau Admin untuk upload mod',
      });
    }

    // 3. Tentukan initial_role untuk audit (sebelum pending)
    const targetRole = getTargetApprovalAfterApprove(session.guild_roles || []);

    // 4. Insert mod dengan status pending atau official
    const { data: newMod, error: insertErr } = await supabaseAdmin
      .from('mods')
      .insert({
        title:           modData.title?.trim(),
        
        description:     modData.description?.trim(),
        category:        modData.category    || 'Moonloader',
        platform:        modData.platform    || 'PC',
        image_url:       modData.imageUrl    || '',
        media_url:       modData.mediaUrl    || '',
        download_url:    modData.downloadUrl,
        is_premium:      approvalStatus === 'official' ? (modData.isPremium ?? false) : false,
        is_reshare: isReshare || false,
        original_author: isReshare ? originalAuthor?.trim() || null : null,
        // Jika reshare, author yang tampil adalah originalAuthor:
        author: isReshare ? (originalAuthor?.trim() || session.username) : session.username,
        tags:            modData.tags        || [],
        uploaded_by:     session.discord_id,
        // Official langsung publish, sisanya pending
        approval_status: approvalStatus,
        file_size:       modData.fileSize    || null,
        version:         modData.version     || '1.0.0',
        // Simpan target role untuk keperluan approve nanti
        // (admin bisa tahu harus approve ke 'verified' atau 'unofficial')
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 5. Admin log
    await supabaseAdmin.from('admin_logs').insert({
      admin_id:     session.discord_id,
      admin_name:   session.username,
      action:       'upload_mod',
      target_type:  'mod',
      target_id:    newMod.id,
      target_label: modData.title,
      metadata:     { approval_status: approvalStatus, target_role: targetRole },
    });

    // 6. Kirim webhook notif ke Discord (await agar tidak silent fail)
    const webhookUrl = process.env.DISCORD_WEBHOOK_MOD_SUBMIT;
    if (webhookUrl) {
      const isPending  = approvalStatus === 'pending';
      const embedColor = isPending ? 0x6B7280 : 0x22C55E;
      const embedTitle = isPending ? '📦 Mod Baru Menunggu Review' : '✅ Mod Official Dipublish';

      await sendDiscordWebhook(webhookUrl, {
        embeds: [{
          title:       embedTitle,
          color:       embedColor,
          description: `**${modData.title}** dikirim oleh **${session.username}**`,
          fields: [
            { name: 'Kategori',   value: modData.category || 'Moonloader', inline: true },
            { name: 'Platform',   value: modData.platform || 'PC',         inline: true },
            { name: 'Status',     value: isPending ? `⏳ Pending Review (akan jadi ${targetRole})` : '✅ Official', inline: false },
            { name: 'Mod ID',     value: `\`${newMod.id}\``, inline: false },
          ],
          timestamp: new Date().toISOString(),
        }],
      });
    } else {
      console.warn('[mod] DISCORD_WEBHOOK_MOD_SUBMIT env tidak diset');
    }

    const isOfficialDirect = approvalStatus === 'official';
    return res.status(200).json({
      success:         true,
      mod:             newMod,
      approval_status: approvalStatus,
      message: isOfficialDirect
        ? 'Mod berhasil dipublish!'
        : 'Mod berhasil diupload! Menunggu review dari admin sebelum dipublish.',
    });

  } catch (err: any) {
    console.error('[api/mod] Error:', err);
    return res.status(500).json({
      error:   'Server error saat upload mod',
      message: err?.message || 'Unknown error',
    });
  }
}