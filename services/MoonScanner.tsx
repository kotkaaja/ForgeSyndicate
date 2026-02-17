import React, { useState, useRef, useCallback } from 'react';
import { Shield, Upload, AlertTriangle, CheckCircle, XCircle, ChevronDown, Loader2, ExternalLink, Search, Globe, MessageSquare, Terminal, FolderOpen, Zap } from 'lucide-react';

// ── GANTI DENGAN URL RAILWAY MOONSCANNER KAMU ─────────────────
const MOONSCANNER_API = 'https://scannerlua-production.up.railway.app';

// ── Types ──────────────────────────────────────────────────────
interface Threat {
  label: string;
  url: string;
  method: string;
  caller?: string;
  body_preview?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Intercept {
  method: string;
  url: string;
  is_sus: boolean;
  threat?: string;
  caller?: string;
  body_preview?: string;
}

interface ScanResult {
  scanId: string;
  filename: string;
  ts: string;
  verdict: 'CLEAN' | 'MALICIOUS' | 'ERROR';
  threats: Threat[];
  luaBin?: string;
  reportUrl?: string;
  run: {
    stdout?: string;
    stderr?: string;
    script_error?: string;
    events_ran?: boolean;
    chat?: { msg: string; color: number }[];
    log?: string[];
    intercepts?: Intercept[];
    vfs?: Record<string, string>;
    error?: string;
  };
}

// ── Tab type ───────────────────────────────────────────────────
type TabId = 'threats' | 'http' | 'chat' | 'console' | 'vfs';

// ── Verdict config ─────────────────────────────────────────────
const VERDICT_CONFIG = {
  CLEAN: {
    icon: <CheckCircle size={20} />,
    label: 'CLEAN',
    color: 'text-green-400',
    bg: 'bg-green-900/10 border-green-900/30',
    glow: 'shadow-[0_0_24px_rgba(21,128,61,0.2)]',
  },
  MALICIOUS: {
    icon: <XCircle size={20} />,
    label: 'MALICIOUS',
    color: 'text-red-400',
    bg: 'bg-red-900/10 border-red-900/30',
    glow: 'shadow-[0_0_24px_rgba(220,38,38,0.2)]',
  },
  ERROR: {
    icon: <AlertTriangle size={20} />,
    label: 'ERROR',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/10 border-yellow-900/30',
    glow: 'shadow-[0_0_24px_rgba(202,138,4,0.2)]',
  },
};

// ── Utility ────────────────────────────────────────────────────
const esc = (s: string) =>
  s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ─────────────────────────────────────────────────────────────
const MoonScanner: React.FC = () => {
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState<ScanResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('threats');
  const [stepIdx, setStepIdx]     = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const STEPS = ['Upload', 'Parse', 'Sandbox', 'Intercept', 'Report'];

  const setFile_ = (f: File) => {
    if (!f.name.match(/\.lua2?c?$/i)) {
      setError('Hanya file .lua atau .luac yang diterima.');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile_(f);
  }, []);

  const doScan = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setStepIdx(0);

    // progress animation
    const tick = (p: number, s: number) => { setProgress(p); setStepIdx(s); };

    try {
      tick(15, 0);
      const fd = new FormData();
      fd.append('script', file);

      tick(35, 1);
      const res = await fetch(`${MOONSCANNER_API}/api/scan`, { method: 'POST', body: fd });
      tick(65, 2);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${res.status}`);
      }

      tick(85, 3);
      const data: ScanResult = await res.json();
      tick(100, 4);

      await new Promise(r => setTimeout(r, 300));
      setResult(data);
      setActiveTab(data.threats.length > 0 ? 'threats' : 'http');
    } catch (e: any) {
      setError(e.message || 'Gagal terhubung ke MoonScanner API.');
    } finally {
      setScanning(false);
    }
  };

  // ── Render tabs ──────────────────────────────────────────────
  const renderThreats = () => {
    if (!result) return null;
    if (result.threats.length > 0) {
      return (
        <div className="divide-y divide-zinc-800/60">
          {result.threats.map((t, i) => (
            <div key={i} className="p-4 flex gap-3">
              <span className={`mt-0.5 shrink-0 text-[9px] font-black px-2 py-1 rounded border uppercase tracking-wider h-fit
                ${t.severity === 'HIGH' ? 'bg-red-900/30 text-red-400 border-red-800/50' : 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'}`}>
                {t.severity}
              </span>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">{t.label}</p>
                <p className="text-zinc-500 text-xs font-mono break-all mt-1">{t.url}</p>
                {t.caller && <p className="text-zinc-600 text-xs mt-1">Caller: {t.caller}</p>}
                {t.body_preview && (
                  <pre className="mt-2 text-[10px] text-yellow-400 bg-yellow-950/30 border border-yellow-900/30 rounded p-2 overflow-x-auto max-h-24 font-mono">
                    {t.body_preview}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (result.verdict === 'ERROR') {
      return (
        <div className="p-5 border-l-2 border-yellow-700/60 bg-yellow-950/10">
          <p className="text-yellow-400 font-bold font-heading text-sm tracking-widest mb-2">⚠ TIDAK DAPAT DIKONFIRMASI</p>
          <p className="text-zinc-500 text-xs font-mono break-all">{result.run.script_error || result.run.error || 'Script error tidak diketahui.'}</p>
          <p className="text-zinc-600 text-xs mt-3 leading-relaxed">
            {!result.run.events_ran
              ? 'Script crash sebelum event simulation berjalan. Keamanan script tidak dapat dikonfirmasi.'
              : 'Script berjalan dengan error pada beberapa bagian.'}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <CheckCircle size={36} className="text-green-500" />
        <p className="font-heading text-green-400 text-lg tracking-widest">TIDAK ADA THREAT TERDETEKSI</p>
        <p className="text-zinc-600 text-xs">Events simulated successfully</p>
      </div>
    );
  };

  const renderHTTP = () => {
    const ints = result?.run.intercepts || [];
    if (!ints.length) return (
      <p className="p-5 text-zinc-600 text-xs font-mono">Tidak ada HTTP call yang dideteksi.</p>
    );
    return (
      <div className="divide-y divide-zinc-800/60">
        {ints.map((i, idx) => (
          <div key={idx} className="flex gap-3 items-start px-4 py-3 text-xs font-mono">
            <span className="text-blue-400 shrink-0 w-10">{i.method}</span>
            <span className="flex-1 text-zinc-400 break-all">{i.url}</span>
            {i.is_sus
              ? <span className="text-red-400 shrink-0">⚠ {i.threat}</span>
              : <span className="text-green-500 shrink-0">✓</span>
            }
          </div>
        ))}
      </div>
    );
  };

  const renderChat = () => {
    const chat = result?.run.chat || [];
    if (!chat.length) return <p className="p-5 text-zinc-600 text-xs font-mono">Tidak ada chat output.</p>;
    return (
      <div className="p-4 space-y-1 font-mono text-xs">
        {chat.map((c, i) => {
          const clr = typeof c.color === 'number' && c.color !== -1
            ? `rgb(${(c.color>>16)&255},${(c.color>>8)&255},${c.color&255})`
            : '#cdd6f4';
          return <div key={i} style={{ color: clr }}>{c.msg}</div>;
        })}
      </div>
    );
  };

  const renderConsole = () => (
    <pre className="p-4 font-mono text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
      {[
        result?.run.stdout,
        result?.run.stderr ? `\n[STDERR]\n${result.run.stderr}` : '',
        result?.run.script_error ? `\n[ERROR]\n${result.run.script_error}` : '',
      ].filter(Boolean).join('') || '(no output)'}
    </pre>
  );

  const renderVFS = () => {
    const vfs = result?.run.vfs || {};
    const keys = Object.keys(vfs);
    if (!keys.length) return <p className="p-5 text-zinc-600 text-xs font-mono">Tidak ada file yang ditulis.</p>;
    return (
      <div className="divide-y divide-zinc-800/60">
        {keys.map(fp => (
          <div key={fp}>
            <div className="flex justify-between px-4 py-2 bg-zinc-900/60 text-xs font-mono">
              <span className="text-yellow-400">{fp}</span>
              <span className="text-zinc-600">{vfs[fp].length}B</span>
            </div>
            <pre className="px-4 py-3 text-[11px] font-mono text-zinc-500 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {vfs[fp] || '(empty)'}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  const TABS: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'threats',  label: 'Threats',  icon: <Shield size={13}/>,       count: result?.threats.length },
    { id: 'http',     label: 'HTTP',     icon: <Globe size={13}/>,         count: result?.run.intercepts?.length },
    { id: 'chat',     label: 'Chat',     icon: <MessageSquare size={13}/>, count: result?.run.chat?.length },
    { id: 'console',  label: 'Console',  icon: <Terminal size={13}/> },
    { id: 'vfs',      label: 'VFS',      icon: <FolderOpen size={13}/>,    count: result?.run.vfs ? Object.keys(result.run.vfs).length : 0 },
  ];

  const vc = result ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="relative border-b border-zinc-800/60 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/5 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase tracking-widest mb-4 bg-green-900/20 border border-green-900/40 px-3 py-1.5 rounded-full">
            <Zap size={10} className="text-green-500" />
            Lua Runtime Security Sandbox
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-black text-white mb-3 tracking-tight">
            MOON<span className="text-green-400">SCANNER</span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg mx-auto leading-relaxed">
            Upload script MoonLoader — sandbox LuaJIT nyata akan mengeksekusinya dan
            mengintersep semua HTTP request secara runtime, termasuk script yang di-<em>obfuscate</em>.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* ── Drop Zone ─────────────────────────────────────── */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
            ${dragging
              ? 'border-green-500 bg-green-900/10 shadow-[0_0_40px_rgba(21,128,61,0.15)]'
              : file
                ? 'border-green-800/60 bg-green-900/5'
                : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
            }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".lua,.luac"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile_(f); }}
          />

          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 bg-green-900/30 border border-green-800/60 rounded-xl flex items-center justify-center mx-auto">
                <Shield size={22} className="text-green-400" />
              </div>
              <p className="text-white font-bold text-sm">{file.name}</p>
              <p className="text-zinc-600 text-xs">{(file.size / 1024).toFixed(1)} KB · klik untuk ganti</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-zinc-800/60 rounded-xl flex items-center justify-center mx-auto">
                <Upload size={22} className="text-zinc-500" />
              </div>
              <div>
                <p className="text-zinc-300 font-bold text-sm">Drop file .lua di sini</p>
                <p className="text-zinc-600 text-xs mt-1">max 2MB · .lua & .luac</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Error ─────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-900/10 border border-red-900/30 rounded-xl p-4 text-sm">
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* ── Scan Button ───────────────────────────────────── */}
        <button
          onClick={doScan}
          disabled={!file || scanning}
          className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:bg-zinc-800 disabled:text-zinc-600
            text-white font-heading font-black text-xl tracking-widest rounded-xl transition-all
            hover:shadow-[0_0_32px_rgba(21,128,61,0.4)] disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {scanning
            ? <><Loader2 size={18} className="animate-spin" /> SCANNING...</>
            : <><Search size={18} /> SCAN SCRIPT</>
          }
        </button>

        {/* ── Progress ──────────────────────────────────────── */}
        {scanning && (
          <div className="space-y-3">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-700 to-green-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(21,128,61,0.6)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between">
              {STEPS.map((s, i) => (
                <span key={s} className={`text-[10px] font-bold uppercase tracking-wider transition-colors
                  ${i < stepIdx ? 'text-green-600' : i === stepIdx ? 'text-green-400' : 'text-zinc-700'}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Result ────────────────────────────────────────── */}
        {result && vc && (
          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-[#111]">

            {/* Verdict header */}
            <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800 ${vc.glow}`}>
              <div className="flex items-center gap-3">
                <span className={vc.color}>{vc.icon}</span>
                <div>
                  <span className={`font-heading text-2xl font-black tracking-widest ${vc.color}`}>
                    {vc.label}
                  </span>
                  <p className="text-zinc-600 text-xs mt-0.5 font-mono">
                    {result.filename} · {result.threats.length} threat(s) ·
                    events: {result.run.events_ran ? '✓' : '✗'} ·
                    {new Date(result.ts).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              {result.reportUrl && (
                <a
                  href={`${MOONSCANNER_API}${result.reportUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-all"
                >
                  <ExternalLink size={12}/> Report
                </a>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all
                    ${activeTab === t.id
                      ? 'text-green-400 border-green-500 bg-green-900/5'
                      : 'text-zinc-600 border-transparent hover:text-zinc-300 hover:bg-zinc-900/30'
                    }`}
                >
                  {t.icon} {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black
                      ${t.id === 'threats' && t.count > 0
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-zinc-800 text-zinc-500'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-[180px]">
              {activeTab === 'threats'  && renderThreats()}
              {activeTab === 'http'     && renderHTTP()}
              {activeTab === 'chat'     && renderChat()}
              {activeTab === 'console'  && renderConsole()}
              {activeTab === 'vfs'      && renderVFS()}
            </div>
          </div>
        )}

        {/* ── Info box ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🔬', title: 'Runtime Analysis', desc: 'Script dieksekusi nyata di LuaJIT sandbox, bukan sekadar static scan.' },
            { icon: '🌐', title: 'HTTP Intercept', desc: 'Semua request keluar ditangkap — webhook Discord, API, dsb.' },
            { icon: '🔒', title: 'Anti-Obfuscation', desc: 'Script yang di-obfuscate tetap ter-analisis karena dieksekusi langsung.' },
          ].map(item => (
            <div key={item.title} className="bg-[#141414] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
              <div className="text-xl mb-2">{item.icon}</div>
              <p className="text-white font-bold text-xs mb-1">{item.title}</p>
              <p className="text-zinc-600 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MoonScanner;