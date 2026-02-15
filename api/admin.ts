// api/admin.ts — FIXED v2
// Fix: approve pending mod, edit rating, webhook berfungsi

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];

// ── Webhook helper (await, bukan fire-and-forget) ─────────────────────────────
async function sendDiscordWebhook(webhookUrl: string, payload: object): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[webhook] Gagal (${response.status}): ${text}`);
    }
  } catch (err) {
    console.error('[webhook] Error:', err);
  }
}

// ─── ACTION: DELETE-RATING ────────────────────────────────────────────────────
async function handleDeleteRating(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, ratingId, modId } = req.body;
  if (!sessionId || !ratingId) return res.status(400).json({ error: 'sessionId dan ratingId diperlukan' });

  try {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Session tidak valid' });

    const isAdmin = (session.guild_roles || []).some(
      (r: string) => ADMIN_ROLES.includes(r.toLowerCase())
    );
    if (!isAdmin) return res.status(403).json({ error: 'Hanya admin yang bisa hapus rating' });

    const { data: rating } = await supabaseAdmin
      .from('mod_reviews')
      .select('username, rating, comment, mod_id')
      .eq('id', ratingId)
      .single();

    const { error: deleteErr } = await supabaseAdmin
      .from('mod_reviews')
      .delete()
      .eq('id', ratingId);

    if (deleteErr) throw deleteErr;

    // Recalculate rating
    const targetModId = modId || rating?.mod_id;
    if (targetModId) {
      const { data: reviews } = await supabaseAdmin
        .from('mod_reviews')
        .select('rating')
        .eq('mod_id', targetModId)
        .eq('is_hidden', false);

      const list = reviews || [];
      const avg  = list.length > 0
        ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length
        : 0;

      await supabaseAdmin
        .from('mods')
        .update({ rating: avg, rating_count: list.length })
        .eq('id', targetModId);
    }

    await supabaseAdmin.from('admin_logs').insert({
      admin_id:    session.discord_id,
      admin_name:  session.username,
      action:      'delete_rating',
      target_type: 'rating',
      target_id:   ratingId,
      target_label: rating ? `Rating oleh ${rating.username} (⭐ ${rating.rating})` : ratingId,
      metadata:    rating ? { username: rating.username, rating: rating.rating, comment: rating.comment } : null,
    });

    return res.status(200).json({ success: true, message: 'Rating berhasil dihapus dan rating mod diperbarui' });
  } catch (err: any) {
    console.error('[delete-rating]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── ACTION: EDIT-RATING ──────────────────────────────────────────────────────
async function handleEditRating(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, ratingId, rating, comment } = req.body;
  if (!sessionId || !ratingId) return res.status(400).json({ error: 'sessionId dan ratingId diperlukan' });
  if (rating !== undefined && (rating < 1 || rating > 5))
    return res.status(400).json({ error: 'Rating harus antara 1-5' });

  try {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Session tidak valid' });

    const isAdmin = (session.guild_roles || []).some(
      (r: string) => ADMIN_ROLES.includes(r.toLowerCase())
    );
    if (!isAdmin) return res.status(403).json({ error: 'Hanya admin yang bisa edit rating' });

    // Ambil data lama untuk log
    const { data: oldRating } = await supabaseAdmin
      .from('mod_reviews')
      .select('username, rating, comment, mod_id')
      .eq('id', ratingId)
      .single();

    if (!oldRating) return res.status(404).json({ error: 'Rating tidak ditemukan' });

    // Build update payload
    const updatePayload: Record<string, any> = {};
    if (rating   !== undefined) updatePayload.rating  = rating;
    if (comment  !== undefined) updatePayload.comment = comment;

    const { error: updateErr } = await supabaseAdmin
      .from('mod_reviews')
      .update(updatePayload)
      .eq('id', ratingId);

    if (updateErr) throw updateErr;

    // Recalculate mod average rating
    const { data: reviews } = await supabaseAdmin
      .from('mod_reviews')
      .select('rating')
      .eq('mod_id', oldRating.mod_id)
      .eq('is_hidden', false);

    const list = reviews || [];
    const avg  = list.length > 0
      ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length
      : 0;

    await supabaseAdmin
      .from('mods')
      .update({ rating: avg, rating_count: list.length })
      .eq('id', oldRating.mod_id);

    // Log
    await supabaseAdmin.from('admin_logs').insert({
      admin_id:    session.discord_id,
      admin_name:  session.username,
      action:      'edit_rating',
      target_type: 'rating',
      target_id:   ratingId,
      target_label: `Edit rating oleh ${oldRating.username}: ${oldRating.rating} → ${rating ?? oldRating.rating}`,
      metadata:    { old: { rating: oldRating.rating, comment: oldRating.comment }, new: updatePayload },
    });

    return res.status(200).json({ success: true, message: 'Rating berhasil diupdate' });
  } catch (err: any) {
    console.error('[edit-rating]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── ACTION: HIDE/UNHIDE RATING ───────────────────────────────────────────────
async function handleToggleRating(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, ratingId, hide } = req.body;
  if (!sessionId || !ratingId) return res.status(400).json({ error: 'sessionId dan ratingId diperlukan' });

  try {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Session tidak valid' });

    const isAdmin = (session.guild_roles || []).some(
      (r: string) => ADMIN_ROLES.includes(r.toLowerCase())
    );
    if (!isAdmin) return res.status(403).json({ error: 'Hanya admin yang bisa sembunyikan rating' });

    const { error: updateErr } = await supabaseAdmin
      .from('mod_reviews')
      .update({
        is_hidden: !!hide,
        hidden_by: hide ? session.discord_id : null,
        hidden_at: hide ? new Date().toISOString() : null,
      })
      .eq('id', ratingId);

    if (updateErr) throw updateErr;

    // Recalculate jika di-hide
    const { data: review } = await supabaseAdmin
      .from('mod_reviews')
      .select('mod_id')
      .eq('id', ratingId)
      .single();

    if (review?.mod_id) {
      const { data: reviews } = await supabaseAdmin
        .from('mod_reviews')
        .select('rating')
        .eq('mod_id', review.mod_id)
        .eq('is_hidden', false);

      const list = reviews || [];
      const avg  = list.length > 0
        ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length
        : 0;

      await supabaseAdmin
        .from('mods')
        .update({ rating: avg, rating_count: list.length })
        .eq('id', review.mod_id);
    }

    return res.status(200).json({ success: true, message: hide ? 'Rating disembunyikan' : 'Rating ditampilkan kembali' });
  } catch (err: any) {
    console.error('[toggle-rating]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── ACTION: MANAGE-MOD ───────────────────────────────────────────────────────
async function handleManageMod(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, modId, action, data: updateData } = req.body;
  if (!sessionId || !modId || !action)
    return res.status(400).json({ error: 'sessionId, modId, action wajib diisi' });

  try {
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Session tidak valid' });

    const roles       = (session.guild_roles || []).map((r: string) => r.toLowerCase());
    const isAdminUser = ADMIN_ROLES.some(r => roles.includes(r));

    const { data: mod } = await supabaseAdmin
      .from('mods')
      .select('id, title, uploaded_by, approval_status')
      .eq('id', modId)
      .single();

    if (!mod) return res.status(404).json({ error: 'Mod tidak ditemukan' });

    const isOwnMod = mod.uploaded_by === session.discord_id;

    // Permissions check
    if ((action === 'delete' || action === 'edit') && !isOwnMod && !isAdminUser) {
      return res.status(403).json({ error: 'Kamu hanya bisa manage mod milikmu sendiri' });
    }
    if ((action === 'approve' || action === 'reject') && !isAdminUser) {
      return res.status(403).json({ error: 'Hanya admin yang bisa approve/reject mod' });
    }

    let result: any;
    let logLabel = '';
    let newStatus = '';

    switch (action) {
      case 'approve': {
        // Tentukan status target berdasarkan metadata mod
        // Cek role uploader di admin_logs
        const { data: uploadLog } = await supabaseAdmin
          .from('admin_logs')
          .select('metadata')
          .eq('target_id', modId)
          .eq('action', 'upload_mod')
          .single();

        const targetRole = uploadLog?.metadata?.target_role || 'unofficial';
        newStatus = updateData?.approval_status || targetRole;

        result = await supabaseAdmin.from('mods').update({
          approval_status: newStatus,
          approved_by:     session.discord_id,
          approved_at:     new Date().toISOString(),
        }).eq('id', modId);
        logLabel = `Approve mod: ${mod.title} → ${newStatus}`;

        // Kirim notif webhook
        const webhookUrl = process.env.DISCORD_WEBHOOK_MOD_SUBMIT;
        if (webhookUrl) {
          await sendDiscordWebhook(webhookUrl, {
            embeds: [{
              title:       '✅ Mod Disetujui',
              color:       0x3B82F6,
              description: `**${mod.title}** telah di-approve oleh **${session.username}**`,
              fields: [
                { name: 'Status Baru', value: newStatus.toUpperCase(), inline: true },
              ],
              timestamp: new Date().toISOString(),
            }],
          });
        }
        break;
      }

      case 'reject': {
        result   = await supabaseAdmin.from('mods').delete().eq('id', modId);
        logLabel = `Reject & hapus mod: ${mod.title}`;

        const webhookUrl = process.env.DISCORD_WEBHOOK_MOD_SUBMIT;
        if (webhookUrl) {
          await sendDiscordWebhook(webhookUrl, {
            embeds: [{
              title:       '❌ Mod Ditolak',
              color:       0xEF4444,
              description: `**${mod.title}** ditolak oleh **${session.username}**`,
              timestamp:   new Date().toISOString(),
            }],
          });
        }
        break;
      }

      case 'delete':
        result   = await supabaseAdmin.from('mods').delete().eq('id', modId);
        logLabel = `Hapus mod: ${mod.title}`;
        break;

      case 'edit': {
        if (!updateData) return res.status(400).json({ error: 'data wajib diisi untuk edit' });
        const allowedFields = ['title', 'description', 'category', 'platform', 'image_url',
          'media_url', 'download_url', 'tags', 'version', 'file_size'];
        if (isAdminUser) allowedFields.push('is_premium', 'approval_status');

        const filteredData: Record<string, any> = {};
        for (const key of allowedFields) {
          if (key in updateData) filteredData[key] = updateData[key];
        }
        result   = await supabaseAdmin.from('mods').update(filteredData).eq('id', modId);
        logLabel = `Edit mod: ${mod.title}`;
        break;
      }

      default:
        return res.status(400).json({ error: 'action tidak valid' });
    }

    if (result?.error) throw result.error;

    await supabaseAdmin.from('admin_logs').insert({
      admin_id:    session.discord_id,
      admin_name:  session.username,
      action:      action + '_mod',
      target_type: 'mod',
      target_id:   modId,
      target_label: logLabel,
      metadata:    { action, is_own_mod: isOwnMod, update_data: updateData, new_status: newStatus },
    });

    return res.status(200).json({ success: true, action, modId });
  } catch (err: any) {
    console.error('[manage-mod]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  switch (action) {
    case 'delete-rating': return handleDeleteRating(req, res);
    case 'edit-rating':   return handleEditRating(req, res);
    case 'toggle-rating': return handleToggleRating(req, res);
    case 'manage-mod':    return handleManageMod(req, res);
    default:              return res.status(400).json({ error: 'Invalid action' });
  }
}