/**
 * LUA OBFUSCATOR SERVICE (STABLE DELAY FIX)
 * Fix: Menambahkan delay agar tidak kena error "Session not found".
 * Mode: Minified One-Liner (Horizontal) sesuai request.
 */

const DEFAULT_API_KEY = "13eeb44e-9a80-2579-201b-d047fc1994972f95"; 

interface ObfuscationConfig {
  MinifiyAll: boolean;
  Virtualize: boolean;
  CustomPlugins: Record<string, any>;
}

export const obfuscateLua = async (sourceCode: string, userApiKey?: string): Promise<string> => {
  const apiKey = userApiKey || DEFAULT_API_KEY;
  const baseUrl = "/api/lua"; 

  if (!sourceCode) return "";

  try {
    // ==========================================
    // 1. CREATE SESSION (UPLOAD SCRIPT)
    // ==========================================
    const newScriptRes = await fetch(`${baseUrl}/newscript`, {
      method: "POST",
      headers: { "apikey": apiKey, "Content-Type": "text/plain" },
      body: sourceCode
    });

    if (!newScriptRes.ok) throw new Error(`Upload Gagal (${newScriptRes.status})`);

    const sessionData = await newScriptRes.json();
    if (!sessionData.sessionId) throw new Error("Gagal mendapatkan Session ID.");

    const sessionId = sessionData.sessionId;
    console.log("Session ID didapat:", sessionId); // Debugging

    // ==========================================
    // FIX PENTING: DELAY 1.5 DETIK
    // ==========================================
    // Memberi waktu server untuk menyimpan session sebelum kita panggil lagi.
    await new Promise(resolve => setTimeout(resolve, 1500));

    // ==========================================
    // 2. OBFUSCATE COMMAND
    // ==========================================
    const config: ObfuscationConfig = {
      MinifiyAll: true, // TRUE = Hasil jadi satu baris panjang (Horizontal)
      Virtualize: true, 
      CustomPlugins: {
        "RewriteToLua51": true,          
        "EncryptStrings": [100],
        "ControlFlowFlattenV1AllBlocks": [30], 
        "JunkifyAllIfStatements": [20],  
        "SwizzleLookups": [50],
        "MutateAllLiterals": [30],
        "Minifier": true 
      }
    };

    const obfRes = await fetch(`${baseUrl}/obfuscate`, {
      method: "POST",
      headers: {
        "apikey": apiKey,
        "sessionId": sessionId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });

    if (!obfRes.ok) throw new Error(`Proses Gagal (${obfRes.status})`);

    const result = await obfRes.json();
    if (result.message) throw new Error(`API Error: ${result.message}`);

    // ==========================================
    // 3. HEADER ASCII ART
    // ==========================================
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
    
    const header = `--[[
________________________________________________________________________________________
______ ___________ _____  _____   _______   ___   _______ _____ _____  ___ _____ _____ 
|  ___|  _  | ___ \\  __ \\|  ___| /  ___\\ \\ / / \\ | |  _  \\_   _/  __ \\/ _ \\_   _|  ___|
| |_  | | | | |_/ / |  \\/| |__   \\ \`--. \\ V /|  \\| | | | | | | | /  \\/ /_\\ \\| | | |__  
|  _| | | | |    /| | __ |  __|   \`--. \\ \\ / | . \` | | | | | | | |   |  _  || | |  __| 
| |   \\ \\_/ / |\\ \\| |_\\ \\| |___  /\\__/ / | | | |\\  | |/ / _| |_| \\__/\\ | | || | | |___ 
\\_|    \\___/\\_| \\_|\\____/\\____/  \\____/  \\_/ \\_| \\_/___/  \\___/ \\____|_| |_/\\_/ \\____/ 
                                                                                        
 Protected by ForgeSyndicate Cloud VM ~ ${dateStr}
 Status: Verified
________________________________________________________________________________________
]]--\n\n`;

    return header + result.code;

  } catch (error: any) {
    console.error("Obfuscator Error:", error);
    throw new Error(error.message || "Gagal menghubungi server.");
  }
};