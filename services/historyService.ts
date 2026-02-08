import { supabase } from '../lib/supabase';

export const saveToHistory = async (
  fileName: string,
  originalCode: string,
  obfuscatedCode: string
) => {
  try {
    // 1. Cek User (Opsional)
    // Kita tetap coba ambil user. Kalau ada sukur, kalau gak ada (null) ya gapapa.
    const { data: { user } } = await supabase.auth.getUser();
    
    // LOGIC BARU: Langsung gas insert, user_id bisa null
    const { error } = await supabase
      .from('obfuscation_history')
      .insert({
        user_id: user ? user.id : null, // Kalau login pakai ID, kalau tamu pakai NULL
        file_name: fileName || 'unknown_script.lua',
        original_code: originalCode,
        obfuscated_code: obfuscatedCode
        // pastikan created_at default now() di database
      });

    if (error) {
      console.error("Supabase Insert Error:", error.message);
      throw error;
    }
    
    console.log("Backup success:", fileName, user ? "(Member)" : "(Guest)");

  } catch (error) {
    // Error kita log saja di console, jangan sampai bikin UI crash
    console.error("Failed to save history:", error);
  }
};