import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
// HAPUS IMPORT NAVBAR DARI SINI
import { obfuscateLua } from '../services/luaObfuscator';
import { saveToHistory } from '../services/historyService'; // IMPORT BARU
import { Download, Copy, Upload, Server, ShieldCheck, Key, Save } from 'lucide-react';

export default function Obfuscator() {
  const [inputCode, setInputCode] = useState<string>('-- Paste script Lua kamu disini\n\nfunction main()\n  print("Hello World")\nend');
  const [outputCode, setOutputCode] = useState<string>('');
  const [fileName, setFileName] = useState<string>('manual_script.lua'); // STATE BARU: Nama File
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('IDLE');
  
  const [apiKey, setApiKey] = useState(""); 
  const [showKeyInput, setShowKeyInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // LOGIC: Baca file + Simpan Nama File
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Simpan nama file biar nanti masuk database
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') setInputCode(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleObfuscate = async () => {
    if (!inputCode) return;
    setIsProcessing(true);
    
    try {
        setStatus('UPLOADING & ANALYZING...');
        
        // 1. Proses Obfuscate
        const result = await obfuscateLua(inputCode, apiKey || undefined);
        
        setStatus('BACKING UP TO DATABASE...');
        
        // 2. AUTO-BACKUP KE SUPABASE
        // Kita jalankan di background (tanpa await) atau dengan await terserah
        await saveToHistory(fileName, inputCode, result);

        setStatus('SUCCESS!');
        setOutputCode(result);
        
    } catch (error: any) {
        alert("ERROR: " + error.message);
    } finally {
        setIsProcessing(false);
        setStatus('IDLE');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputCode);
    alert('Code copied!');
  };

  const downloadFile = () => {
    const element = document.createElement("a");
    const file = new Blob([outputCode], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `protected_${fileName}`; // Nama file hasil download lebih rapi
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
      
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".lua,.txt" className="hidden" />
      
      <div className="container mx-auto px-4 py-8 mt-4">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-blue-500 tracking-tighter mb-2 flex justify-center items-center gap-3">
             <Server size={40} />
             LUA CLOUD <span className="text-white text-base font-bold bg-blue-600 px-2 py-0.5 rounded ml-2">PREMIUM API</span>
          </h1>
          <p className="text-gray-400">Powered by luaobfuscator.com Enterprise Engine</p>
        </div>

        {/* API KEY INPUT TOGGLE */}
        <div className="flex justify-center mb-6">
            <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-xs text-gray-500 flex items-center gap-1 hover:text-white">
                <Key size={12}/> {showKeyInput ? "Hide API Key" : "Set Custom API Key"}
            </button>
        </div>
        {showKeyInput && (
            <div className="flex justify-center mb-6">
                <input 
                    type="password" 
                    placeholder="Paste API Key here (Optional)" 
                    className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-sm w-96 text-center focus:border-blue-500 outline-none"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
          {/* INPUT */}
          <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-neutral-800 px-4 py-3 flex justify-between items-center border-b border-neutral-700">
              <span className="text-xs font-bold text-gray-300 tracking-wider flex items-center gap-2">
                 SOURCE CODE: <span className="text-blue-400">{fileName}</span>
              </span>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs px-3 py-1.5 rounded font-bold">
                <Upload size={14} /> UPLOAD
              </button>
            </div>
            <div className="flex-grow">
              <Editor height="100%" defaultLanguage="lua" theme="vs-dark" value={inputCode} onChange={(val) => setInputCode(val || '')} options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true }} />
            </div>
          </div>

          {/* OUTPUT */}
          <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="bg-neutral-800 px-4 py-3 flex justify-between items-center border-b border-neutral-700">
              <span className="text-xs font-bold text-blue-500 tracking-wider">SECURE OUTPUT</span>
              {outputCode && (
                <div className="flex gap-2">
                  <button onClick={copyToClipboard} className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs px-3 py-1.5 rounded font-bold">
                    <Copy size={14} /> COPY
                  </button>
                  <button onClick={downloadFile} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold">
                    <Download size={14} /> DOWNLOAD
                  </button>
                </div>
              )}
            </div>
            <div className="flex-grow relative">
               {isProcessing && (
                  <div className="absolute inset-0 z-20 bg-neutral-950/90 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-500 font-mono text-sm tracking-widest animate-pulse">{status}</span>
                  </div>
               )}
              <Editor height="100%" defaultLanguage="lua" theme="vs-dark" value={outputCode} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', automaticLayout: true }} />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center pb-10">
          <button onClick={handleObfuscate} disabled={isProcessing || !inputCode} className={`px-12 py-4 rounded-full font-bold text-lg tracking-wide transition-all duration-300 shadow-xl flex items-center gap-3 ${isProcessing ? 'bg-neutral-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:scale-105 hover:shadow-blue-900/40'}`}>
            {isProcessing ? 'PROCESSING...' : <><ShieldCheck size={24}/> OBFUSCATE NOW</>}
          </button>
        </div>
      </div>
    </div>
  );
}