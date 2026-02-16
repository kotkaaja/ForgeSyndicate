/**
 * LUA OBFUSCATOR SERVICE - FORGE SYNDICATE EDITION
 * 
 * Features:
 * - SLICK MODERN ASCII art banner
 * - Professional protection info
 * - Minified One-Liner output (Horizontal)
 * - VM + String Encryption + Control Flow Obfuscation
 * 
 * Mode: Production
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
    console.log("✅ Session ID didapat:", sessionId);

    // ==========================================
    // DELAY 1.5 DETIK (Fix session not found)
    // ==========================================
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
    // 3. HEADER ASCII ART - SLICK MODERN STYLE
    // ==========================================
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}:${seconds}`;
    
    const header = `--[[
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

    ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
    ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
    █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
    ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
    ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
                                                
    ███████╗██╗   ██╗███╗   ██╗██████╗ ██╗ ██████╗ █████╗ ████████╗███████╗
    ██╔════╝╚██╗ ██╔╝████╗  ██║██╔══██╗██║██╔════╝██╔══██╗╚══██╔══╝██╔════╝
    ███████╗ ╚████╔╝ ██╔██╗ ██║██║  ██║██║██║     ███████║   ██║   █████╗  
    ╚════██║  ╚██╔╝  ██║╚██╗██║██║  ██║██║██║     ██╔══██║   ██║   ██╔══╝  
    ███████║   ██║   ██║ ╚████║██████╔╝██║╚██████╗██║  ██║   ██║   ███████╗
    ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝

    ┌─────────────────────────────────────────────────────────────────────────┐
    │ 🔐 SCRIPT PROTECTION SYSTEM                                             │
    ├─────────────────────────────────────────────────────────────────────────┤
    │ Compiled      : ${dateStr} ${timeStr}                                   │
    │ Encryption    : MAXIMUM (VM + String + Control Flow)                    │
    │ Optimization  : Minified One-Liner                                      │
    │ Target        : LuaJIT 5.1 / Moonloader / Monetload                     │
    ├─────────────────────────────────────────────────────────────────────────┤
    │ ⚠️  WARNING: Reverse engineering prohibited • DMCA Protected            │
    │ 🌐 Website: forgelua.vercel.app                                        │
    │ 💬 Discord: discord.gg/X2UW7VRqnB                                      │
    └─────────────────────────────────────────────────────────────────────────┘

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
]]--

`;

    console.log("✅ Obfuscation berhasil! Header ditambahkan.");
    return header + result.code;

  } catch (error: any) {
    console.error("❌ Obfuscator Error:", error);
    throw new Error(error.message || "Gagal menghubungi server.");
  }
};