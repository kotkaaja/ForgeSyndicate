// services/historyService.ts — FIXED v2
// Perubahan utama:
//   - Simpan discord_id (dari Discord OAuth session) bukan user_id Supabase Auth
//   - user_id selalu null karena sistem tidak pakai Supabase Auth
//   - Perlu jalankan DATABASE_FIX_v2.sql terlebih dahulu

import { supabase } from '../lib/supabase';

const SESSION_KEY = 'ds_session_id';

// Helper: ambil discord_id dari session yang aktif
async function getCurrentDiscordId(): Promise<string | null> {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;
  try {
    const res = await fetch(`/api/auth/session?id=${sessionId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.discord_id ?? null;
  } catch {
    return null;
  }
}

export const saveToHistory = async (
  fileName:       string,
  originalCode:   string,
  obfuscatedCode: string
): Promise<void> => {
  try {
    const discordId = await getCurrentDiscordId();

    const { error } = await supabase
      .from('obfuscation_history')
      .insert({
        user_id:         null,          // selalu null, sistem pakai Discord OAuth
        discord_id:      discordId,     // null kalau guest, diisi kalau login
        file_name:       fileName || 'unknown_script.lua',
        original_code:   originalCode,
        obfuscated_code: obfuscatedCode,
      });

    if (error) {
      // Kolom discord_id belum ada → migration belum dijalankan
      if (error.message?.includes('discord_id')) {
        console.warn('[historyService] Jalankan DATABASE_FIX_v2.sql dulu!');
        // Fallback: simpan tanpa discord_id
        await supabase.from('obfuscation_history').insert({
          user_id:         null,
          file_name:       fileName || 'unknown_script.lua',
          original_code:   originalCode,
          obfuscated_code: obfuscatedCode,
        });
        return;
      }
      console.error('[historyService] Error:', error.message);
    }
  } catch (err) {
    // Jangan crash UI karena history gagal disimpan
    console.error('[historyService] Failed silently:', err);
  }
};