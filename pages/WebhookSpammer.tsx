import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Send, Loader2, CheckCircle, Shield, Info, Copy, Check, ExternalLink, RefreshCw, XCircle, Search, Terminal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const WebhookSpammer: React.FC = () => {
  const { user } = useAuth();
  
  // State Utama
  const [mode, setMode] = useState<'discord' | 'telegram'>('discord');
  const [target, setTarget] = useState(''); // URL Webhook atau Token Bot
  const [chatId, setChatId] = useState(''); // Khusus Telegram
  
  // State Konfigurasi
  const [count, setCount] = useState(100);
  const [delay, setDelay] = useState(1000); // Ms
  
  // State Eksekusi
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ sent: 0, fail: 0, total: 0 });
  const [copiedExample, setCopiedExample] = useState(false);

  // State Telegram Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [foundChats, setFoundChats] = useState<any[]>([]);

  // Ref untuk menghentikan loop
  const stopRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- FUNGSI SCAN TELEGRAM ---
  const handleScanChats = async () => {
    if (!target) return alert("⚠️ Masukkan Token Bot Telegram terlebih dahulu!");
    setIsScanning(true);
    setFoundChats([]);
    
    try {
      const res = await fetch('/api/webhook-spam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan_telegram', token: target })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      if (data.chats.length === 0) {
        alert("⚠️ Tidak ada chat ditemukan. Pastikan bot sudah di-start atau dimasukkan ke grup, lalu coba lagi.");
      } else {
        setFoundChats(data.chats);
      }
    } catch (err) {
      alert(`Gagal scan: ${(err as Error).message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // --- FUNGSI SPAM (CLIENT SIDE LOOP) ---
  const addLog = (msg: string, type: 'success' | 'error' | 'info') => {
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setLogs(prev => [...prev, `[${time}] ${prefix} ${msg}`].slice(-50)); // Simpan 50 log terakhir
  };

  const handleStart = async () => {
    if (!target || (mode === 'telegram' && !chatId)) {
      alert('Isi semua field yang diperlukan!');
      return;
    }

    // Reset
    stopRef.current = false;
    setIsRunning(true);
    setStats({ sent: 0, fail: 0, total: count });
    setLogs([]);
    let successCount = 0;
    let failCount = 0;

    addLog(`Memulai serangan ke ${mode}... Target: ${count} pesan`, 'info');

    // Loop
    for (let i = 0; i < count; i++) {
      if (stopRef.current) {
        addLog('🛑 Serangan dihentikan user.', 'info');
        break;
      }

      try {
        const res = await fetch('/api/webhook-spam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'execute',
            mode, 
            target, 
            chatId: mode === 'telegram' ? chatId : undefined 
          })
        });
        
        if (res.ok) {
          successCount++;
          // Optional: addLog(`Paket #${i+1} terkirim`, 'success'); 
        } else {
          failCount++;
          const data = await res.json();
          if (res.status === 404) {
            addLog('🎉 Webhook/Bot SUDAH MATI (404)! Target berhasil dihapus.', 'success');
            stopRef.current = true;
          } else if (res.status === 429) {
            addLog('⚠️ Rate limit, menambah delay...', 'error');
            await new Promise(r => setTimeout(r, 2000));
          } else {
            addLog(`Gagal: ${data.error}`, 'error');
            if (res.status === 401 || res.status === 403) stopRef.current = true;
          }
        }
      } catch (err) {
        failCount++;
        addLog(`Error Jaringan: ${(err as Error).message}`, 'error');
      }

      setStats({ sent: successCount, fail: failCount, total: count });
      
      if (!stopRef.current) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    setIsRunning(false);
    addLog(`✅ Selesai. Total Sukses: ${successCount}, Gagal: ${failCount}`, 'info');
  };

  const handleStop = () => {
    stopRef.current = true;
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
          <h2 className="text-white font-black text-xl">Akses Ditolak</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Login diperlukan untuk mengakses fitur Security Tools ini.
          </p>
          <Link to="/login" className="inline-block bg-blue-700 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all">
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16 font-sans">
      <div className="max-w-4xl mx-auto px-4 pt-24">
        {/* Header Style Original */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-900/20 border border-blue-800/40 px-4 py-2 rounded-full mb-4">
            <Shield size={16} className="text-blue-400"/>
            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Security Tool</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            SA-MP Anti-Keylogger
          </h1>
          <p className="text-zinc-500 text-sm max-w-2xl mx-auto leading-relaxed">
            Lindungi akun SA-MP dengan mengirim data palsu ke webhook keylogger. 
            Fitur ini setara dengan bot Discord, termasuk deteksi chat ID otomatis.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-900/10 border border-blue-800/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-blue-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-blue-400 font-bold text-sm mb-1">Status Sistem:</p>
              <ul className="text-zinc-400 text-xs space-y-1 leading-relaxed">
                <li>• Generator Data: <span className="text-green-400">Aktif (Nama, Password, IP Server)</span></li>
                <li>• Smart Detection: <span className="text-green-400">Aktif (Auto Stop jika webhook mati)</span></li>
                <li>• Keamanan: <span className="text-yellow-400">Gunakan delay {'>'}1000ms agar aman</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* KOLOM KIRI: INPUT FORM */}
          <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl h-fit">
            
            {/* Mode Selector */}
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-3">
                Target Platform
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => !isRunning && setMode('discord')}
                  className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'discord' ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20' : 'bg-zinc-900 text-zinc-500'}`}
                >
                  Discord
                </button>
                <button 
                  onClick={() => !isRunning && setMode('telegram')}
                  className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'telegram' ? 'bg-[#229ED9] text-white shadow-lg shadow-[#229ED9]/20' : 'bg-zinc-900 text-zinc-500'}`}
                >
                  Telegram
                </button>
              </div>
            </div>

            {/* Target Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {mode === 'discord' ? 'Webhook URL' : 'Bot Token'}
                </label>
                <button onClick={() => copyExample(mode === 'discord' ? 'https://discord.com/api/webhooks/...' : '123456:ABC-DEF')} className="text-[10px] text-zinc-600 hover:text-white flex items-center gap-1">
                  {copiedExample ? <Check size={10}/> : <Copy size={10}/>} Contoh
                </button>
              </div>
              <input 
                value={target} 
                onChange={e => setTarget(e.target.value)}
                disabled={isRunning}
                placeholder={mode === 'discord' ? 'https://discord.com/api/webhooks/...' : '123456:ABC-DEF...'}
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl text-sm focus:border-blue-700 outline-none transition-all placeholder:text-zinc-700 font-mono"
              />
            </div>

            {/* Telegram Chat ID Scanner (FITUR BARU) */}
            {mode === 'telegram' && (
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-bold text-zinc-500 uppercase">Chat ID Target</label>
                   <button 
                     onClick={handleScanChats}
                     disabled={isRunning || isScanning}
                     className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white flex items-center gap-1 transition-colors"
                   >
                      {isScanning ? <Loader2 size={10} className="animate-spin"/> : <Search size={10}/>}
                      Cari ID Otomatis
                   </button>
                </div>
                
                {foundChats.length > 0 && (
                  <select 
                    onChange={e => setChatId(e.target.value)}
                    value={chatId}
                    className="w-full bg-black border border-zinc-700 text-white text-xs p-2 rounded mb-2"
                  >
                    <option value="">-- Pilih Chat Ditemukan --</option>
                    {foundChats.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.type})
                      </option>
                    ))}
                  </select>
                )}

                <input 
                  value={chatId} 
                  onChange={e => setChatId(e.target.value)}
                  disabled={isRunning}
                  placeholder="-100xxxxxxx"
                  className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm outline-none font-mono"
                />
              </div>
            )}

            {/* Config Sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Jumlah (1-1000)</label>
                <input 
                  type="number" 
                  value={count} 
                  onChange={e => setCount(Math.min(1000, Number(e.target.value)))}
                  disabled={isRunning}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm outline-none text-center"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Delay (ms)</label>
                <input 
                  type="number" 
                  value={delay} 
                  onChange={e => setDelay(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm outline-none text-center"
                />
              </div>
            </div>

            {/* Buttons */}
            {!isRunning ? (
              <button 
                onClick={handleStart}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20"
              >
                <Send size={16}/> MULAI SERANGAN
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg animate-pulse"
              >
                <XCircle size={16}/> STOP SERANGAN
              </button>
            )}
            
            <p className="text-center text-zinc-600 text-[10px]">
              *Tools ini otomatis berhenti jika target webhook dihapus ownernya.
            </p>
          </div>

          {/* KOLOM KANAN: TERMINAL & STATS */}
          <div className="flex flex-col gap-4 h-full">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl text-center">
                <div className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Total</div>
                <div className="text-2xl font-mono font-bold text-white">{stats.total}</div>
              </div>
              <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl text-center">
                <div className="text-green-500 text-[10px] font-bold uppercase mb-1">Sukses</div>
                <div className="text-2xl font-mono font-bold text-green-400">{stats.sent}</div>
              </div>
              <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl text-center">
                <div className="text-red-500 text-[10px] font-bold uppercase mb-1">Gagal</div>
                <div className="text-2xl font-mono font-bold text-red-400">{stats.fail}</div>
              </div>
            </div>

            {/* Terminal Window */}
            <div className="flex-1 bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[300px]">
              <div className="bg-zinc-900 px-4 py-2 flex items-center gap-2 border-b border-zinc-800">
                <Terminal size={14} className="text-zinc-400"/>
                <span className="text-xs text-zinc-400 font-mono">system_monitor.log</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1">
                {logs.length === 0 && (
                  <div className="text-zinc-700 italic flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 size={24} className="opacity-20"/>
                    <span>Menunggu perintah eksekusi...</span>
                  </div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className={`break-all ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-zinc-500'}`}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

          </div>
        </div>

        {/* Warning Section */}
        <div className="mt-6 p-5 bg-yellow-900/15 border border-yellow-800/30 rounded-xl flex gap-3 items-start">
          <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5"/>
          <div>
            <p className="text-yellow-400 font-bold text-sm mb-2">⚠️ Peringatan Penggunaan</p>
            <ul className="text-zinc-400 text-xs space-y-1 leading-relaxed">
              <li>• Tool ini HANYA untuk "Counter Attack" terhadap keylogger SA-MP.</li>
              <li>• Jika status berubah menjadi 404/403 (Gagal), berarti pemilik keylogger sudah menghapus webhook/botnya.</li>
              <li>• Misi Anda berhasil jika log menunjukkan Webhook mati.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WebhookSpammer;