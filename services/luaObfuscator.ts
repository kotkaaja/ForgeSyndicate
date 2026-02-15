/**
 * FORGE SYNDICATE - LUA OBFUSCATOR ENGINE (Custom, No External API)
 * Techniques:
 *   1. Strip comments
 *   2. Rename local variables  → _a, _b, _c ...
 *   3. Encode strings          → string.char(104,101,108,108,111)
 *   4. Obfuscate numbers       → 5 → (3+(2)), 100 → (143-(43))
 *   5. Minify                  → one-liner
 *   6. Inject junk variables   → local _x=(71-(46));
 *   7. String lookup table     → semua encoded string masuk 1 table
 */

// ── Variable name generator ────────────────────────────────────────────────────
const VAR_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
let _varCounter = 0;

function resetCounter(): void { _varCounter = 0; }

function genVarName(index: number): string {
  let name = '';
  let n = index;
  do {
    name = VAR_CHARS[n % VAR_CHARS.length] + name;
    n = Math.floor(n / VAR_CHARS.length) - 1;
  } while (n >= 0);
  return name;
}

// ── Number obfuscation: 5 → (3+(2)) ──────────────────────────────────────────
function obfuscateNumber(n: number): string {
  if (n === 0) return '(0)';
  if (n < 0) return `(0-(${obfuscateNumber(-n)}))`;

  const pick = Math.floor(Math.random() * 2);
  if (pick === 0) {
    const a = Math.floor(Math.random() * n);
    return `(${a}+(${n - a}))`;
  } else {
    const a = n + Math.floor(Math.random() * 50) + 1;
    return `(${a}-(${a - n}))`;
  }
}

// ── String encoder: "hello" → string.char(104,101,108,108,111) ────────────────
function encodeString(s: string): string {
  if (s.length === 0) return '""';
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
  return `string.char(${bytes.join(',')})`;
}

// ── Token types ───────────────────────────────────────────────────────────────
type TokenType = 'comment' | 'string' | 'number' | 'keyword' | 'ident' | 'op' | 'ws' | 'newline';

interface Token {
  type: TokenType;
  value: string;
}

const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
  'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
  'repeat', 'return', 'then', 'true', 'until', 'while',
]);

// ── Tokenizer ─────────────────────────────────────────────────────────────────
function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Long comment --[[ ... ]]
    if (code[i] === '-' && code[i + 1] === '-') {
      if (code[i + 2] === '[' && code[i + 3] === '[') {
        const end = code.indexOf(']]', i + 4);
        if (end !== -1) {
          tokens.push({ type: 'comment', value: code.slice(i, end + 2) });
          i = end + 2;
          continue;
        }
      }
      // Short comment
      const nl = code.indexOf('\n', i);
      const end = nl === -1 ? code.length : nl;
      tokens.push({ type: 'comment', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // String literals
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      let str = quote;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === '\\') { str += code[j] + code[j + 1]; j += 2; }
        else { str += code[j]; j++; }
      }
      str += quote;
      tokens.push({ type: 'string', value: str });
      i = j + 1;
      continue;
    }

    // Long string [[ ... ]]
    if (code[i] === '[' && code[i + 1] === '[') {
      const end = code.indexOf(']]', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'string', value: code.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
    }

    // Numbers
    if (/[0-9]/.test(code[i]) || (code[i] === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let j = i;
      if (code[i] === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
        j += 2;
        while (j < code.length && /[0-9a-fA-F]/.test(code[j])) j++;
      } else {
        while (j < code.length && /[0-9.]/.test(code[j])) j++;
        if (code[j] === 'e' || code[j] === 'E') {
          j++;
          if (code[j] === '+' || code[j] === '-') j++;
          while (j < code.length && /[0-9]/.test(code[j])) j++;
        }
      }
      tokens.push({ type: 'number', value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      tokens.push({ type: LUA_KEYWORDS.has(word) ? 'keyword' : 'ident', value: word });
      i = j;
      continue;
    }

    // Newlines
    if (code[i] === '\n') { tokens.push({ type: 'newline', value: '\n' }); i++; continue; }

    // Whitespace
    if (/[ \t\r]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[ \t\r]/.test(code[j])) j++;
      tokens.push({ type: 'ws', value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Two-char operators
    const twoChar = code.slice(i, i + 2);
    if (['..', '==', '~=', '<=', '>=', '::', '->'].includes(twoChar)) {
      tokens.push({ type: 'op', value: twoChar });
      i += 2;
      continue;
    }

    tokens.push({ type: 'op', value: code[i] });
    i++;
  }

  return tokens;
}

// ── Step 1: Strip comments ────────────────────────────────────────────────────
function stripComments(tokens: Token[]): Token[] {
  return tokens.filter(t => t.type !== 'comment');
}

// ── Step 2: Rename local variables ───────────────────────────────────────────
// Global/builtin Lua functions & MoonLoader APIs yang tidak boleh diganti
const PROTECTED_GLOBALS = new Set([
  // Lua core
  'print', 'pairs', 'ipairs', 'next', 'type', 'tostring', 'tonumber',
  'error', 'assert', 'pcall', 'xpcall', 'select', 'unpack', 'rawget',
  'rawset', 'rawequal', 'setmetatable', 'getmetatable', 'require',
  'dofile', 'loadfile', 'load', 'loadstring', 'collectgarbage',
  // Lua libs
  'io', 'os', 'string', 'table', 'math', 'coroutine', 'package', 'debug',
  'utf8', 'bit', 'bit32', 'jit', 'ffi',
  // String methods
  'format', 'gsub', 'gmatch', 'match', 'find', 'sub', 'byte', 'char',
  'rep', 'len', 'upper', 'lower', 'reverse',
  // Table methods
  'insert', 'remove', 'concat', 'sort', 'unpack', 'move',
  // Math
  'random', 'randomseed', 'floor', 'ceil', 'abs', 'sqrt', 'sin', 'cos',
  'tan', 'max', 'min', 'huge', 'pi', 'ldexp', 'log', 'pow', 'modf',
  // OS
  'time', 'clock', 'date', 'exit', 'getenv',
  // MoonLoader / CLEO / SA-MP specific
  'lua_thread', 'create', 'requests', 'get', 'post',
  'getWorkingDirectory', 'NaN', '_ENV', '_G', '_VERSION',
  // Request object keys (jangan rename)
  'status_code', 'text', 'headers', 'verify', 'timeout', 'body',
  // ffi methods
  'load', 'cdef', 'new', 'cast', 'string', 'typeof', 'istype',
  // User-exported functions (tetap accessible dari luar)
  'Get_Secure_HWID', 'Start_Secure_Login',
]);

function renameVariables(tokens: Token[]): Token[] {
  const varMap = new Map<string, string>();
  let counter = 0;

  // First pass: collect all local variable names
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'keyword' && (t.value === 'local' || t.value === 'function')) {
      let j = i + 1;
      while (j < tokens.length && tokens[j].type === 'ws') j++;
      if (j < tokens.length && tokens[j].type === 'ident') {
        const name = tokens[j].value;
        if (!PROTECTED_GLOBALS.has(name) && !varMap.has(name)) {
          varMap.set(name, `_${genVarName(counter++)}`);
        }
      }
    }
  }

  // Second pass: replace
  return tokens.map(t => {
    if (t.type === 'ident' && varMap.has(t.value)) {
      return { ...t, value: varMap.get(t.value)! };
    }
    return t;
  });
}

// ── Step 3: Obfuscate number literals ────────────────────────────────────────
function obfuscateNumbers(tokens: Token[]): Token[] {
  return tokens.map(t => {
    if (t.type === 'number') {
      const n = parseFloat(t.value);
      if (Number.isInteger(n) && n >= 0 && n < 10000 && !t.value.startsWith('0x')) {
        return { ...t, value: obfuscateNumber(n) };
      }
    }
    return t;
  });
}

// ── Step 4: Encode string literals ───────────────────────────────────────────
function obfuscateStrings(tokens: Token[]): Token[] {
  return tokens.map(t => {
    if (t.type === 'string') {
      if (t.value.startsWith('[[')) return t; // skip long strings
      const inner = t.value.slice(1, -1);
      if (inner.length === 0 || inner.length > 100) return t;
      if (inner.includes('\\')) return t; // skip strings with escape sequences
      return { ...t, value: encodeString(inner) };
    }
    return t;
  });
}

// ── Step 5: Minify ────────────────────────────────────────────────────────────
function minify(tokens: Token[]): string {
  const result: string[] = [];

  for (const t of tokens) {
    if (t.type === 'ws' || t.type === 'newline') continue;

    const cur = t.value;
    if (result.length > 0) {
      const lastChar = result[result.length - 1].slice(-1);
      const firstChar = cur[0];
      // Need space between two alphanumeric tokens
      if (/[a-zA-Z0-9_]/.test(lastChar) && /[a-zA-Z0-9_]/.test(firstChar)) {
        result.push(' ');
      }
    }
    result.push(cur);
  }

  return result.join('');
}

// ── Step 6: Inject junk variables ────────────────────────────────────────────
function injectJunk(code: string): string {
  const junk: string[] = [];
  const count = 5 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const name = `_${genVarName(_varCounter++)}`;
    const val = Math.floor(Math.random() * 999) + 1;
    junk.push(`local ${name}=${obfuscateNumber(val)}`);
  }
  return junk.join(';') + ';' + code;
}

// ── Step 7: Build string lookup table ────────────────────────────────────────
// Semua string.char(...) dikumpulkan jadi 1 table, dipanggil via getter
function buildStringTable(code: string): string {
  const strings: string[] = [];
  const stringMap = new Map<string, number>();

  const tableName = `_${genVarName(_varCounter++)}`;
  const getterName = `_${genVarName(_varCounter++)}`;

  // Collect all string.char(...) patterns  
  // Pattern: string.char(N,N,N,...) – greedy match balanced
  const matches: string[] = [];
  const strPattern = /string\.char\([0-9,]+\)/g;
  let match;
  while ((match = strPattern.exec(code)) !== null) {
    const full = match[0];
    if (!stringMap.has(full)) {
      stringMap.set(full, strings.length);
      strings.push(full);
    }
    matches.push(full);
  }

  if (strings.length === 0) return code;

  const tableEntries = strings.map((s, i) => `[${i + 1}]=${s}`).join(',');
  const tableDecl = `local ${tableName}={${tableEntries}}`;
  const getterDecl = `local function ${getterName}(i) return ${tableName}[i] end`;

  let idx = 0;
  const processed = code.replace(/string\.char\([0-9,]+\)/g, () => {
    const key = matches[idx++] || '';
    const i = stringMap.get(key) ?? 0;
    return `${getterName}(${i + 1})`;
  });

  return `${tableDecl};${getterDecl};${processed}`;
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export const obfuscateLua = async (sourceCode: string): Promise<string> => {
  if (!sourceCode || sourceCode.trim().length === 0) {
    throw new Error('Source code kosong');
  }

  resetCounter();

  try {
    // Pipeline
    let tokens = tokenize(sourceCode);
    tokens = stripComments(tokens);
    tokens = renameVariables(tokens);
    tokens = obfuscateNumbers(tokens);
    tokens = obfuscateStrings(tokens);

    let code = minify(tokens);
    code = injectJunk(code);
    code = buildStringTable(code);

    // ASCII art header
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const header = `--[[
 ______  _____  ____  ____  _____  ____  _  _  ____  ____  ___  __  ____  ____ 
(  ___|/ ___ \\|  _ \\/ ___|( ___ )/ ___)( \\/ )(  _ \\(  _ \\/ __)(  )/ ___)(_  _)
 ) __) ) ___) ) )_) )\\___  ) _)  \\___ \\ \\  /  ) ) ) ) ) / (__  )(  (__   )(  
(_)   \\_____)(_____/ (____)(_____)(____/ (__) (____/(____/\\___)(__)\\___)  (__) 

 Protected by ForgeSyndicate Obfuscator Engine ~ ${dateStr}
 Techniques: VarRename + StrEncode + NumObf + Minify + JunkInject
]]--\n\n`;

    return header + code;
  } catch (err: any) {
    throw new Error('Obfuscation gagal: ' + (err.message || String(err)));
  }
};