// api/admin/delete-rating.ts
// DELETE /api/admin/delete-rating
// Body: { sessionId: string, ratingId: string, modId: string }

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, ratingId, modId } = req.body;
  if (!sessionId || !ratingId) return res.status(400).json({ error: 'sessionId dan ratingId diperlukan' });

  try {
    // 1. Validasi session
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('discord_id, username, guild_roles')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(401).json({ error: 'Session tidak valid' });

    // 2. Cek role admin
    const isAdmin = (session.guild_roles || []).some(
      (r: string) => ADMIN_ROLES.includes(r.toLowerCase())
    );
    if (!isAdmin) return res.status(403).json({ error: 'Hanya admin yang bisa hapus rating' });

    // 3. Ambil info rating untuk audit log
    const { data: rating } = await supabaseAdmin
      .from('mod_reviews')
      .select('username, rating, comment, mod_id')
      .eq('id', ratingId)
      .single();

    // 4. Hapus rating
    const { error: deleteErr } = await supabaseAdmin
      .from('mod_reviews')
      .delete()
      .eq('id', ratingId);

    if (deleteErr) throw deleteErr;

    // 5. Recalculate rating mod (karena satu rating dihapus)
    if (modId || rating?.mod_id) {
      const targetModId = modId || rating?.mod_id;
      const { data: reviews } = await supabaseAdmin
        .from('mod_reviews')
        .select('rating')
        .eq('mod_id', targetModId)
        .eq('is_hidden', false);

      const reviews_list = reviews || [];
      const avg   = reviews_list.length > 0
        ? reviews_list.reduce((s: number, r: any) => s + r.rating, 0) / reviews_list.length
        : 0;

      await supabaseAdmin
        .from('mods')
        .update({ rating: avg, rating_count: reviews_list.length })
        .eq('id', targetModId);
    }

    // 6. Tulis audit log
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