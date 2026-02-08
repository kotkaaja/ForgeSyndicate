// services/simpleObfuscator.ts

export const obfuscateCode = (sourceCode: string): string => {
  let code = sourceCode;

  // 1. HEADER (Watermark ala LuaObfuscator)
  const header = `--[[ 
   PROTECTED BY FORGESYNDICATE OBFUSCATOR
   MODE: VIRTUALIZATION (EMULATED)
   UID: ${Math.random().toString(36).substring(7).toUpperCase()}
   TIME: ${new Date().toISOString()}
]]--\n\n`;

  // 2. PRE-PROCESS: Hapus Komentar
  code = code.replace(/--\[\[[\s\S]*?\]\]--/g, ''); // Hapus block comment
  code = code.replace(/--.*$/gm, ''); // Hapus single line comment

  // 3. VARIABLE MAPPING (Mengubah nama variable jadi v1, v2, dst)
  // Kita cari kata-kata umum yang sering jadi variable local
  const commonVars = new Set(code.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || []);
  
  // Jangan ubah keyword bawaan Lua!
  const luaKeywords = [
    "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
    "if", "in", "local", "nil", "not", "or", "repeat", "return", "then",
    "true", "until", "while", "print", "wait", "sampRegisterChatCommand", 
    "sampAddChatMessage", "script_name", "script_author", "require", "string", 
    "math", "table", "pairs", "ipairs", "tonumber", "tostring", "mimgui"
  ];

  let varCounter = 1;
  const varMap = new Map<string, string>();

  // Buat mapping v1, v2, v3...
  commonVars.forEach((word) => {
    if (!luaKeywords.includes(word) && word.length > 2) {
      if (!varMap.has(word)) {
        varMap.set(word, `v${varCounter++}`);
      }
    }
  });

  // Terapkan mapping variable (Hati-hati, ini regex sederhana)
  // Untuk hasil perfect butuh parser AST, tapi ini cukup untuk 'style' old
  varMap.forEach((newValue, oldValue) => {
    const regex = new RegExp(`\\b${oldValue}\\b`, 'g');
    code = code.replace(regex, newValue);
  });

  // 4. STRING ENCRYPTION (Ubah string jadi decimal bytecode)
  // Contoh: "Hello" -> "\72\101\108\108\111"
  code = code.replace(/"([^"]+)"/g, (match, p1) => {
    let result = "";
    for (let i = 0; i < p1.length; i++) {
      result += "\\" + p1.charCodeAt(i);
    }
    return `"${result}"`;
  });

  // 5. MINIFY (Jadikan satu baris panjang)
  // Ganti baris baru dengan spasi, lalu hapus spasi berlebih
  code = code.replace(/[\r\n]+/g, ' '); 
  code = code.replace(/\s+/g, ' ');

  // 6. WRAPPER (Bungkus dalam fungsi anonim biar susah di-edit variables-nya)
  const wrapperStart = `(function() local _ENV = {string=string, math=math, table=table, print=print, pairs=pairs}; `;
  const wrapperEnd = ` end)()`;

  // Gabungkan semua
  return header + wrapperStart + code + wrapperEnd;
};
