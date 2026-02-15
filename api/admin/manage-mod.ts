// api/admin/manage-mod.ts
// POST /api/admin/manage-mod
// Actions: approve, reject, delete, edit
// Body: { sessionId, modId, action, data? }

import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];
const ALL_STAFF   = [...ADMIN_ROLES, 'moderator', 'developer'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, modId, action, data: updateData } = req.body;
  if (!sessionId || !modId || !action)
    return res.status(400).json({ error: 'sessionId, modId, action wajib diisi' });

  try {
    // 1. Validasi session
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Session tidak valid' });

    const roles        = (session.guild_roles || []).map((r: string) => r.toLowerCase());
    const isAdminUser  = ADMIN_ROLES.some(r => roles.includes(r));
    const isStaff      = ALL_STAFF.some(r => roles.includes(r));

    // 2. Ambil mod yang akan dikelola
    const { data: mod } = await supabaseAdmin
      .from('mods')
      .select('id, title, uploaded_by, approval_status')
      .eq('id', modId)
      .single();

    if (!mod) return res.status(404).json({ error: 'Mod tidak ditemukan' });

    // 3. Cek permission berdasarkan action
    const isOwnMod = mod.uploaded_by === session.discord_id;

    // delete & edit mod orang lain → hanya admin
    if ((action === 'delete' || action === 'edit') && !isOwnMod && !isAdminUser) {
      return res.status(403).json({ error: 'Kamu hanya bisa manage mod milikmu sendiri' });
    }
    // approve/reject/verify → hanya admin
    if ((action === 'approve' || action === 'reject' || action === 'set_verified') && !isAdminUser) {
      return res.status(403).json({ error: 'Hanya admin yang bisa approve/reject mod' });
    }

    let result: any;
    let logLabel = '';

    switch (action) {
      case 'approve':
        result = await supabaseAdmin.from('mods').update({
          approval_status: 'verified',
          approved_by:     session.discord_id,
          approved_at:     new Date().toISOString(),
        }).eq('id', modId);
        logLabel = `Approve mod: ${mod.title}`;

        // Webhook notif ke modder
        if (process.env.DISCORD_WEBHOOK_MOD_SUBMIT) {
          fetch(process.env.DISCORD_WEBHOOK_MOD_SUBMIT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title:       '✅ Mod Disetujui',
                color:       0x3B82F6,
                description: `**${mod.title}** telah di-approve oleh admin`,
                timestamp:   new Date().toISOString(),
              }],
            }),
          }).catch(() => {});
        }
        break;

      case 'reject':
        result = await supabaseAdmin.from('mods').delete().eq('id', modId);
        logLabel = `Reject & hapus mod: ${mod.title}`;
        break;

      case 'delete':
        result = await supabaseAdmin.from('mods').delete().eq('id', modId);
        logLabel = `Hapus mod: ${mod.title}`;
        break;

      case 'edit':
        if (!updateData) return res.status(400).json({ error: 'data wajib diisi untuk edit' });
        const allowedFields = ['title', 'description', 'category', 'platform', 'image_url',
                               'media_url', 'download_url', 'tags', 'version', 'file_size'];
        // Admin bisa edit is_premium juga
        if (isAdminUser) allowedFields.push('is_premium', 'approval_status');

        const filteredData: Record<string, any> = {};
        for (const key of allowedFields) {
          if (key in updateData) filteredData[key] = updateData[key];
        }
        result = await supabaseAdmin.from('mods').update(filteredData).eq('id', modId);
        logLabel = `Edit mod: ${mod.title}`;
        break;

      default:
        return res.status(400).json({ error: 'action tidak valid' });
    }

    if (result?.error) throw result.error;

    // 4. Audit log
    await supabaseAdmin.from('admin_logs').insert({
      admin_id:    session.discord_id,
      admin_name:  session.username,
      action:      action + '_mod',
      target_type: 'mod',
      target_id:   modId,
      target_label: logLabel,
      metadata:    { action, is_own_mod: isOwnMod, update_data: updateData },
    });

    return res.status(200).json({ success: true, action, modId });

  } catch (err: any) {
    console.error('[manage-mod]', err);
    return res.status(500).json({ error: err.message });
  }
}