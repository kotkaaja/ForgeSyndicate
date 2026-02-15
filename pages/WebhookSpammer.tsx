// pages/WebhookSpammer.tsx - Public version for all users
import React, { useState } from 'react';
import { AlertTriangle, Send, Loader2, CheckCircle, Shield, Info, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const WebhookSpammer: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'discord' | 'telegram'>('discord');
  const [target, setTarget] = useState('');
  const [chatId, setChatId] = useState('');
  const [count, setCount] = useState(100);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [copiedExample, setCopiedExample] = useState(false);

  const handleStart = async () => {
    if (!target || (mode === 'telegram' && !chatId)) {
      alert('Isi semua field yang diperlukan!');
      return;
    }

    if (count < 1 || count > 1000) {
      alert('Jumlah pesan harus antara 1-1000');
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const sessionId = localStorage.getItem('ds_session_id');
      const res = await fetch('/api/webhook-spam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mode,
          target,
          chatId: mode === 'telegram' ? chatId : undefined,
          count
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }

      setResult({ sent: data.sent, failed: data.failed });
    } catch (err) {
      alert('Terjadi error: ' + (err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const copyExample = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Shield size={48} className="text-blue-500 mx-auto"/>
          <h2 className="text-white font-black text-xl">Login Diperlukan</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Kamu harus login untuk menggunakan Anti-Keylogger Tool. 
            Fitur ini membantu melindungi akun SA-MP kamu dari keylogger.
          </p>
          <Link
            to="/login"
            className="inline-block bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      <div className="max-w-3xl mx-auto px-4 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-900/20 border border-blue-800/40 px-4 py-2 rounded-full mb-4">
            <Shield size={16} className="text-blue-400"/>
            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Security Tool</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            SA-MP Anti-Keylogger
          </h1>
          <p className="text-zinc-500 text-sm max-w-2xl mx-auto leading-relaxed">
            Lindungi akun SA-MP kamu dengan mengirim data palsu ke webhook keylogger. 
            Tool ini akan mem-flood webhook dengan informasi fake sehingga keylogger tidak bisa mendapatkan data asli kamu.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-900/10 border border-blue-800/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-blue-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-blue-400 font-bold text-sm mb-1">Cara Kerja:</p>
              <ul className="text-zinc-400 text-xs space-y-1 leading-relaxed">
                <li>• Keylogger SA-MP biasanya mengirim username & password ke Discord/Telegram webhook</li>
                <li>• Tool ini akan mengirim ratusan data palsu ke webhook tersebut</li>
                <li>• Data asli kamu akan tenggelam di antara data palsu</li>
                <li>• Keylogger menjadi tidak berguna karena tidak tahu mana data yang asli</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl">
          {/* Mode selector */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-3">
              Pilih Platform Webhook
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setMode('discord')}
                className={`py-4 rounded-xl font-bold text-sm transition-all ${
                  mode === 'discord' 
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.032.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  Discord Webhook
                </div>
              </button>
              <button 
                onClick={() => setMode('telegram')}
                className={`py-4 rounded-xl font-bold text-sm transition-all ${
                  mode === 'telegram' 
                    ? 'bg-[#229ED9] text-white shadow-lg shadow-[#229ED9]/20' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.099.155.232.171.326.016.093.036.306.02.472z"/>
                  </svg>
                  Telegram Bot
                </div>
              </button>
            </div>
          </div>

          {/* Target input with example */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {mode === 'discord' ? 'Discord Webhook URL' : 'Telegram Bot Token'}
              </label>
              <button
                onClick={() => copyExample(
                  mode === 'discord' 
                    ? 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop'
                    : '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
                )}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
              >
                {copiedExample ? <Check size={10}/> : <Copy size={10}/>}
                {copiedExample ? 'Copied!' : 'Copy example'}
              </button>
            </div>
            <input 
              value={target} 
              onChange={e => setTarget(e.target.value)}
              placeholder={mode === 'discord' 
                ? 'https://discord.com/api/webhooks/...' 
                : '123456789:ABC-DEF...'
              }
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl text-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-900/50 outline-none transition-all placeholder:text-zinc-700"
            />
            {mode === 'discord' && (
              <a 
                href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-zinc-600 hover:text-blue-400 flex items-center gap-1 mt-1.5 transition-colors"
              >
                <ExternalLink size={10}/>
                Cara membuat webhook Discord
              </a>
            )}
          </div>

          {/* Telegram Chat ID */}
          {mode === 'telegram' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Telegram Chat ID
                </label>
                <button
                  onClick={() => copyExample('-1001234567890')}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
                >
                  {copiedExample ? <Check size={10}/> : <Copy size={10}/>}
                  {copiedExample ? 'Copied!' : 'Copy example'}
                </button>
              </div>
              <input 
                value={chatId} 
                onChange={e => setChatId(e.target.value)}
                placeholder="-1001234567890 atau 123456789"
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl text-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-900/50 outline-none transition-all placeholder:text-zinc-700"
              />
              <a 
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-zinc-600 hover:text-blue-400 flex items-center gap-1 mt-1.5 transition-colors"
              >
                <ExternalLink size={10}/>
                Cara mendapatkan Chat ID
              </a>
            </div>
          )}

          {/* Count */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
              Jumlah Pesan Palsu (1-1000)
            </label>
            <div className="flex items-center gap-3">
              <input 
                type="range"
                value={count} 
                onChange={e => setCount(Number(e.target.value))}
                min={1}
                max={1000}
                className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="number"
                value={count}
                onChange={e => setCount(Math.min(1000, Math.max(1, Number(e.target.value))))}
                min={1}
                max={1000}
                className="w-20 bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm text-center focus:border-blue-700 outline-none"
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-zinc-600">
              <span>Lebih cepat</span>
              <span className="text-zinc-500 font-semibold">{count} pesan × 100ms = ~{(count * 0.1).toFixed(1)}s</span>
              <span>Lebih aman</span>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 shrink-0"/>
                <div>
                  <p className="text-green-400 font-bold text-sm">Selesai!</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {result.sent} pesan terkirim{result.failed > 0 && `, ${result.failed} gagal`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Start button */}
          <button 
            onClick={handleStart}
            disabled={running || !target || (mode === 'telegram' && !chatId)}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg disabled:shadow-none"
          >
            {running ? (
              <><Loader2 size={16} className="animate-spin"/> Mengirim {count} pesan...</>
            ) : (
              <><Send size={16}/> 🚀 MULAI SPAM WEBHOOK</>
            )}
          </button>

          {/* Info text */}
          <p className="text-center text-zinc-700 text-[10px] leading-relaxed">
            Tool ini akan mengirim {count} pesan palsu dengan delay 100ms per pesan
          </p>
        </div>

        {/* Warning & Usage Guide */}
        <div className="mt-6 space-y-4">
          {/* Warning */}
          <div className="p-5 bg-yellow-900/15 border border-yellow-800/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5"/>
              <div>
                <p className="text-yellow-400 font-bold text-sm mb-2">⚠️ Penting - Baca Sebelum Menggunakan</p>
                <ul className="text-zinc-400 text-xs space-y-1.5 leading-relaxed">
                  <li>• Tool ini HANYA untuk melawan keylogger SA-MP dengan data palsu</li>
                  <li>• Jangan gunakan untuk spam channel Discord/Telegram yang tidak berhubungan dengan keylogger</li>
                  <li>• Data yang dikirim adalah 100% palsu dan random (nama, password, IP server fake)</li>
                  <li>• Gunakan dengan bijak dan bertanggung jawab - penyalahgunaan adalah tindakan ilegal</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How to use */}
          <div className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <Info size={16} className="text-blue-400"/>
              Cara Menggunakan:
            </h3>
            <ol className="text-zinc-400 text-xs space-y-2 leading-relaxed list-decimal list-inside">
              <li>Cek file script SA-MP kamu, cari webhook URL yang mencurigakan</li>
              <li>Copy webhook URL tersebut (Discord atau Telegram)</li>
              <li>Paste di form di atas</li>
              <li>Atur jumlah pesan (disarankan 500-1000 untuk hasil maksimal)</li>
              <li>Klik "MULAI SPAM WEBHOOK"</li>
              <li>Tunggu hingga selesai - webhook akan kebanjiran data palsu</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookSpammer;