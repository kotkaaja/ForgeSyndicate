import React, { useState, useRef, useCallback } from 'react';
import { 
  Shield, Upload, AlertTriangle, CheckCircle, XCircle, 
  Loader2, ExternalLink, Search, Globe, MessageSquare, 
  Terminal, FolderOpen, Zap, Copy, Check, Siren, ArrowRight 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
    icon: <CheckCircle size={24} />,
    label: 'CLEAN',
    color: 'text-green-400',
    bg: 'bg-green-900/10 border-green-900/30',
    glow: 'shadow-[0_0_24px_rgba(21,128,61,0.2)]',
  },
  MALICIOUS: {
    icon: <XCircle size={24} />,
    label: 'MALICIOUS',
    color: 'text-red-400',
    bg: 'bg-red-900/10 border-red-900/30',
    glow: 'shadow-[0_0_24px_rgba(220,38,38,0.2)]',
  },
  ERROR: {
    icon: <AlertTriangle size={24} />,
    label: 'ERROR',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/10 border-yellow-900/30',
    glow: 'shadow-[0_0_24px_rgba(202,138,4,0.2)]',
  },
};

// ── Helper Component: URL Actions ──────────────────────────────
const UrlWithActions: React.FC<{ url: string; label?: string }> = ({ url, label }) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Deteksi tipe URL untuk tombol Spam
  const isDiscord = url.includes('discord.com/api/webhooks') || url.includes('discordapp.com/api/webhooks');
  const isTelegram = url.includes('api.telegram.org/bot');
  const isSpammable = isDiscord || isTelegram;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpam = () => {
    // Navigasi ke webhook spammer (opsional: bisa pass state jika receiver mendukung)
    navigate('/webhook-spam');
    // Copy URL otomatis agar user tinggal paste
    navigator.clipboard.writeText(url);
    alert("URL disalin! Silakan paste di kolom target.");
  };

  return (
    <div className="group mt-1 bg-black/40 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-zinc-400 font-mono text-xs truncate select-all cursor-text hover:text-zinc-300 transition-colors">
            {url}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-bold text-zinc-300 transition-all"
            title="Salin Link"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'COPIED' : 'COPY'}
          </button>

          {/* Spam Button (Hanya muncul jika Discord/Telegram) */}
          {isSpammable && (
            <button
              onClick={handleSpam}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/20 hover:bg-red-600 border border-red-900/50 hover:border-red-500 rounded text-[10px] font-bold text-red-400 hover:text-white transition-all animate-pulse hover:animate-none shadow-[0_0_10px_rgba(220,38,38,0.1)] hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              title="Serang Webhook Ini"
            >
              <Siren size={12} />
              HANCURKAN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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

  // ── Render Tabs ──────────────────────────────────────────────
  const renderThreats = () => {
    if (!result) return null;
    if (result.threats.length > 0) {
      return (
        <div className="divide-y divide-zinc-800/60">
          {result.threats.map((t, i) => (
            <div key={i} className="p-5 hover:bg-zinc-900/20 transition-colors">
              <div className="flex gap-4 items-start">
                <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider h-fit mt-1
                  ${t.severity === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                  {t.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-200 font-bold text-sm">{t.label}</p>
                    {t.method && <span className="text-[10px] text-zinc-600 font-mono border border-zinc-800 px-1.5 rounded bg-black">{t.method}</span>}
                  </div>
                  
                  {/* URL Display with Action Buttons */}
                  <UrlWithActions url={t.url} />

                  {t.caller && (
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600 font-mono">
                      <Terminal size={10} />
                      <span>Caller: {t.caller}</span>
                    </div>
                  )}
                  
                  {t.body_preview && (
                    <div className="mt-3">
                      <p className="text-[10px] text-zinc-500 mb-1 font-bold uppercase tracking-wider">Payload Preview:</p>
                      <pre className="text-[10px] text-yellow-500/90 bg-black/60 border border-yellow-900/20 rounded p-3 overflow-x-auto max-h-32 font-mono scrollbar-thin scrollbar-thumb-zinc-800">
                        {t.body_preview}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (result.verdict === 'ERROR') {
      return (
        <div className="p-6 border-l-2 border-yellow-700/60 bg-yellow-950/10 flex gap-4">
          <AlertTriangle className="text-yellow-500 shrink-0" />
          <div>
            <p className="text-yellow-400 font-bold font-heading text-sm tracking-widest mb-1">⚠ SCAN INCOMPLETE</p>
            <p className="text-zinc-400 text-xs font-mono break-all leading-relaxed">
              {result.run.script_error || result.run.error || 'Script error tidak diketahui.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-900/20 flex items-center justify-center mb-2">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <div>
          <p className="font-heading text-green-400 text-lg tracking-widest font-bold">CLEAN SCRIPT</p>
          <p className="text-zinc-500 text-xs mt-1">Tidak ada URL berbahaya yang terdeteksi selama simulasi.</p>
        </div>
      </div>
    );
  };

  const renderHTTP = () => {
    const ints = result?.run.intercepts || [];
    if (!ints.length) return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
        <Globe size={24} className="opacity-50"/>
        <p className="text-xs font-mono">Tidak ada HTTP call keluar.</p>
      </div>
    );
    return (
      <div className="divide-y divide-zinc-800/60">
        {ints.map((i, idx) => (
          <div key={idx} className="px-5 py-4 hover:bg-zinc-900/20 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 w-fit`}>
                {i.method}
              </span>
              {i.is_sus
                ? <span className="text-[10px] font-bold text-red-400 flex items-center gap-1"><Siren size={10}/> SUSPICIOUS ACTIVITY</span>
                : <span className="text-[10px] font-bold text-green-500 flex items-center gap-1"><Check size={10}/> SAFE TRAFFIC</span>
              }
            </div>
            
            <UrlWithActions url={i.url} />
            
            {i.threat && <p className="text-red-400 text-[10px] mt-1 font-mono">Detected as: {i.threat}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderChat = () => {
    const chat = result?.run.chat || [];
    if (!chat.length) return <p className="p-8 text-center text-zinc-600 text-xs font-mono">Tidak ada output chat game.</p>;
    return (
      <div className="p-4 space-y-1 font-mono text-xs bg-black/20 min-h-[200px]">
        {chat.map((c, i) => {
          const clr = typeof c.color === 'number' && c.color !== -1
            ? `rgb(${(c.color>>16)&255},${(c.color>>8)&255},${c.color&255})`
            : '#cdd6f4';
          return <div key={i} style={{ color: clr }} className="drop-shadow-md">{c.msg}</div>;
        })}
      </div>
    );
  };

  const renderConsole = () => (
    <pre className="p-4 font-mono text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-black/40">
      {[
        result?.run.stdout,
        result?.run.stderr ? `\n[STDERR]\n${result.run.stderr}` : '',
        result?.run.script_error ? `\n[ERROR]\n${result.run.script_error}` : '',
      ].filter(Boolean).join('') || '// No console output captured'}
    </pre>
  );

  const renderVFS = () => {
    const vfs = result?.run.vfs || {};
    const keys = Object.keys(vfs);
    if (!keys.length) return <p className="p-8 text-center text-zinc-600 text-xs font-mono">Tidak ada file yang ditulis ke disk.</p>;
    return (
      <div className="divide-y divide-zinc-800/60">
        {keys.map(fp => (
          <div key={fp} className="group">
            <div className="flex justify-between items-center px-4 py-2 bg-zinc-900/40 text-xs font-mono group-hover:bg-zinc-900/60 transition-colors">
              <span className="text-yellow-400 flex items-center gap-2"><FolderOpen size={12}/> {fp}</span>
              <span className="text-zinc-600 text-[10px]">{vfs[fp].length} bytes</span>
            </div>
            <pre className="px-4 py-3 text-[10px] font-mono text-zinc-500 whitespace-pre-wrap max-h-40 overflow-y-auto bg-black/20">
              {vfs[fp] || '(empty file)'}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  const TABS: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'threats',  label: 'Threats',  icon: <Shield size={14}/>,       count: result?.threats.length },
    { id: 'http',     label: 'HTTP',     icon: <Globe size={14}/>,         count: result?.run.intercepts?.length },
    { id: 'chat',     label: 'Chat',     icon: <MessageSquare size={14}/>, count: result?.run.chat?.length },
    { id: 'console',  label: 'Console',  icon: <Terminal size={14}/> },
    { id: 'vfs',      label: 'VFS',      icon: <FolderOpen size={14}/>,    count: result?.run.vfs ? Object.keys(result.run.vfs).length : 0 },
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
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-widest mb-4 bg-green-500/10 border border-green-500/20 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            <Zap size={12} className="text-green-400 fill-current" />
            Lua Runtime Security Sandbox
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            MOON<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">SCANNER</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
            Upload script MoonLoader — sandbox kami akan mengeksekusinya, membongkar obfuscation secara runtime, 
            dan menangkap Webhook pencuri password secara instan.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* ── Drop Zone ─────────────────────────────────────── */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group
            ${dragging
              ? 'border-green-500 bg-green-900/10 scale-[1.02] shadow-[0_0_40px_rgba(21,128,61,0.15)]'
              : file
                ? 'border-green-800/60 bg-green-900/5'
                : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30'
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
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-900/20 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                <Shield size={32} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{file.name}</p>
                <p className="text-zinc-500 text-sm mt-1 font-mono">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <p className="text-xs text-green-500 font-bold uppercase tracking-wider">File siap di-scan</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-zinc-800/40 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-zinc-800 transition-colors">
                <Upload size={28} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>
              <div>
                <p className="text-zinc-300 font-bold text-lg group-hover:text-white transition-colors">Drop file .lua di sini</p>
                <p className="text-zinc-500 text-sm mt-1">atau klik untuk browse file</p>
              </div>
              <div className="inline-block px-3 py-1 bg-zinc-900 rounded text-[10px] text-zinc-600 border border-zinc-800">
                Supports .lua & .luac
              </div>
            </div>
          )}
        </div>

        {/* ── Error ─────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-red-500/20 rounded-full shrink-0">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-red-400 font-bold text-sm">Terjadi Kesalahan</p>
              <p className="text-red-300/70 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Scan Button ───────────────────────────────────── */}
        <button
          onClick={doScan}
          disabled={!file || scanning}
          className="relative overflow-hidden w-full py-5 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600
            text-white font-heading font-black text-xl tracking-[0.2em] rounded-xl transition-all
            shadow-[0_4px_0_rgb(21,128,61)] hover:shadow-[0_2px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[4px]
            disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
        >
          {scanning ? (
            <><Loader2 size={24} className="animate-spin" /> MENGANALISIS...</>
          ) : (
            <>
              <Search size={24} className="group-hover:scale-110 transition-transform"/> 
              SCAN SCRIPT SEKARANG
            </>
          )}
        </button>

        {/* ── Progress ──────────────────────────────────────── */}
        {scanning && (
          <div className="space-y-4 p-6 bg-[#111] border border-zinc-800 rounded-xl">
            <div className="flex justify-between items-end mb-2">
              <span className="text-green-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                {STEPS[stepIdx]}...
              </span>
              <span className="text-zinc-600 text-[10px] font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between px-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${i <= stepIdx ? 'bg-green-500' : 'bg-zinc-800'}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Result ────────────────────────────────────────── */}
        {result && vc && (
          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-[#111] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Verdict header */}
            <div className={`relative px-6 py-6 border-b border-zinc-800 overflow-hidden ${vc.bg}`}>
               {/* Background Glow */}
               <div className={`absolute top-0 right-0 w-64 h-64 bg-current opacity-10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none ${vc.color}`}></div>

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 ${vc.color} ${vc.glow}`}>
                    {vc.icon}
                  </div>
                  <div>
                    <h2 className={`font-heading text-3xl font-black tracking-widest ${vc.color}`}>
                      {vc.label}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-400 font-mono">
                      <span className="text-white font-bold">{result.filename}</span>
                      <span>•</span>
                      <span>{result.threats.length} threats found</span>
                      <span>•</span>
                      <span className={result.run.events_ran ? 'text-green-500' : 'text-red-500'}>
                        Simulasi: {result.run.events_ran ? 'Sukses' : 'Gagal'}
                      </span>
                    </div>
                  </div>
                </div>

                {result.reportUrl && (
                  <a
                    href={`${MOONSCANNER_API}${result.reportUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-900 px-5 py-3 rounded-xl transition-all"
                  >
                    FULL REPORT <ExternalLink size={14}/>
                  </a>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 overflow-x-auto bg-[#0a0a0a]">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all
                    ${activeTab === t.id
                      ? 'text-white bg-[#111]'
                      : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/40'
                    }`}
                >
                  {activeTab === t.id && <div className="absolute top-0 left-0 w-full h-[2px] bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />}
                  {t.icon} {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-black min-w-[18px] text-center
                      ${activeTab === t.id ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-[300px] bg-[#111]">
              {activeTab === 'threats'  && renderThreats()}
              {activeTab === 'http'     && renderHTTP()}
              {activeTab === 'chat'     && renderChat()}
              {activeTab === 'console'  && renderConsole()}
              {activeTab === 'vfs'      && renderVFS()}
            </div>
            
            <div className="px-6 py-3 bg-[#0a0a0a] border-t border-zinc-800 text-[10px] text-zinc-600 font-mono flex justify-between">
              <span>SCAN ID: {result.scanId}</span>
              <span>{new Date(result.ts).toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}

        {/* ── Features Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-zinc-800/50">
          {[
            { icon: <Terminal size={20}/>, title: 'Runtime Sandbox', desc: 'Script dieksekusi di environment LuaJIT nyata untuk memancing perilaku asli.' },
            { icon: <Globe size={20}/>, title: 'Network Sniffer', desc: 'Menangkap semua HTTP request (Discord/Telegram) bahkan yang tersembunyi.' },
            { icon: <Shield size={20}/>, title: 'De-Obfuscation', desc: 'Tidak peduli seberapa rumit enkripsinya, script harus berjalan untuk mencuri data.' },
          ].map((item, idx) => (
            <div key={idx} className="group bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-zinc-800/60 rounded-xl p-6 hover:border-zinc-700 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4 group-hover:text-green-400 group-hover:bg-green-900/20 transition-colors">
                {item.icon}
              </div>
              <p className="text-white font-bold text-sm mb-2">{item.title}</p>
              <p className="text-zinc-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MoonScanner;