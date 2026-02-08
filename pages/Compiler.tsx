import React, { useState, useRef } from 'react';
// NAVBAR DIHAPUS (Sudah ada di App.tsx)
import { Upload, Download, FileCode, Cpu } from 'lucide-react';

export default function Compiler() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL API (Relatif agar jalan di Vercel & Localhost)
  const API_URL = "/api/compile";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('READY TO COMPILE');
    }
  };

  const handleCompile = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus('UPLOADING & COMPILING...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || err.error || 'Gagal compile');
      }

      // Proses Download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.lua$/i, '.luac');
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setStatus('SUCCESS! DOWNLOADING...');
    } catch (error: any) {
      console.error(error);
      alert(`Gagal Compile!\n\nError: ${error.message}`);
      setStatus('ERROR');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">
      
      <div className="container mx-auto px-4 py-8 mt-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-purple-600 tracking-tighter mb-2 flex justify-center items-center gap-3">
             <Cpu size={40} /> LUAJIT COMPILER
          </h1>
          <p className="text-zinc-500">Compile Lua script menjadi LuaJIT Bytecode (.luac) langsung di Server.</p>
        </div>

        <div className="max-w-xl mx-auto bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-8">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all
                    ${file ? 'border-purple-500 bg-purple-900/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'}
                `}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".lua,.txt" className="hidden" />
                
                {file ? (
                    <div className="text-center animate-in zoom-in duration-300">
                        <FileCode size={48} className="text-purple-500 mx-auto mb-3" />
                        <p className="font-bold text-white text-lg">{file.name}</p>
                        <p className="text-sm text-zinc-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                ) : (
                    <div className="text-center text-zinc-500">
                        <Upload size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-bold text-zinc-300">Klik untuk Upload .lua</p>
                        <p className="text-xs mt-2">Support LuaJIT / MoonLoader</p>
                    </div>
                )}
            </div>

            <button
                onClick={handleCompile}
                disabled={!file || isProcessing}
                className={`
                    w-full mt-6 py-4 rounded-lg font-black text-lg tracking-widest flex items-center justify-center gap-2 transition-all
                    ${!file 
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                        : isProcessing 
                            ? 'bg-purple-900 text-purple-200 cursor-wait'
                            : 'bg-purple-700 hover:bg-purple-600 text-white shadow-lg hover:shadow-purple-500/20 active:scale-95'
                    }
                `}
            >
                {isProcessing ? 'PROCESSING...' : <><Download size={24} /> COMPILE SEKARANG</>}
            </button>

            <div className="text-center mt-4 text-xs font-mono font-bold">
                STATUS: <span className={status === 'ERROR' ? 'text-red-500' : 'text-purple-400'}>{status}</span>
            </div>
        </div>
      </div>
    </div>
  );
}