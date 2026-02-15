// pages/WebhookSpammer.tsx

const WebhookSpammer = () => {
  const [mode, setMode] = useState<'discord' | 'telegram'>('discord');
  const [target, setTarget] = useState('');
  const [chatId, setChatId] = useState('');
  const [count, setCount] = useState(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStart = async () => {
    setRunning(true);
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
    setRunning(false);
    alert(`Selesai! ${data.sent} terkirim, ${data.failed} gagal`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">SA-MP Keylogger Counter</h1>
      
      <div className="space-y-4">
        <div>
          <label>Mode:</label>
          <select value={mode} onChange={e => setMode(e.target.value as any)}>
            <option value="discord">Discord Webhook</option>
            <option value="telegram">Telegram Bot</option>
          </select>
        </div>

        <div>
          <label>{mode === 'discord' ? 'Webhook URL' : 'Bot Token'}:</label>
          <input 
            value={target} 
            onChange={e => setTarget(e.target.value)}
            placeholder={mode === 'discord' 
              ? 'https://discord.com/api/webhooks/...' 
              : '123456:ABC-DEF...'
            }
          />
        </div>

        {mode === 'telegram' && (
          <div>
            <label>Chat ID:</label>
            <input value={chatId} onChange={e => setChatId(e.target.value)}/>
          </div>
        )}

        <div>
          <label>Jumlah Pesan:</label>
          <input 
            type="number" 
            value={count} 
            onChange={e => setCount(Number(e.target.value))}
            min={1}
            max={1000}
          />
        </div>

        <button 
          onClick={handleStart}
          disabled={running}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl"
        >
          {running ? 'Mengirim...' : '🚀 Mulai Spam'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800/40 rounded-xl">
        <p className="text-yellow-400 text-sm">
          ⚠️ Fitur ini hanya untuk melawan keylogger SA-MP dengan data palsu.
          Gunakan dengan bijak!
        </p>
      </div>
    </div>
  );
};