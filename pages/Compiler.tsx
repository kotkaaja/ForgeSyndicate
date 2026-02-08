import React, { useState } from 'react';
import { Upload, FileCode, CheckCircle, AlertCircle, Cpu, Smartphone, Monitor } from 'lucide-react';

const Compiler = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // State untuk memilih arsitektur (Default ke 32-bit buat PC/MoonLoader)
  const [arch, setArch] = useState<'32' | '64'>('32');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.lua')) {
        setFile(selectedFile);
        setStatus('idle');
        setErrorMessage('');
      } else {
        setStatus('error');
        setErrorMessage('Format file harus .lua');
      }
    }
  };

  const handleCompile = async () => {
    if (!file) return;

    setIsCompiling(true);
    setStatus('idle');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);
    // Kirim pilihan arsitektur ke Backend
    formData.append('arch', arch);

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal melakukan compile.');
      }

      // Handle file download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Nama file otomatis disesuaikan
      const originalName = file.name.replace('.lua', '');
      const archLabel = arch === '32' ? 'PC' : 'Mobile';
      a.download = `${originalName}_${archLabel}.luac`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setStatus('success');
    } catch (error: any) {
      console.error('Compile error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 mb-4">
            LuaJIT Compiler
          </h1>
          <p className="text-gray-400 text-lg">
            Compile script Lua kamu menjadi Bytecode (.luac) yang aman dan optimal.
          </p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
          {/* Section Upload */}
          <div className="mb-8">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-700 border-dashed rounded-xl cursor-pointer hover:border-red-500 hover:bg-gray-800/50 transition-all duration-300 group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <FileCode className="w-16 h-16 text-green-500 mb-4" />
                      <p className="mb-2 text-xl text-gray-300 font-semibold">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-500 group-hover:text-red-500 mb-4 transition-colors" />
                      <p className="mb-2 text-lg text-gray-300">Klik untuk upload atau drag & drop</p>
                      <p className="text-sm text-gray-500">Format: .lua only</p>
                    </>
                  )}
                </div>
                <input id="file-upload" type="file" className="hidden" accept=".lua" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          {/* Section Pilihan Target (Architecture) */}
          <div className="mb-8 bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-red-500" /> Pilih Target Platform
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opsi 32-BIT (PC) */}
              <div 
                onClick={() => setArch('32')}
                className={`cursor-pointer p-4 rounded-lg border flex items-center gap-4 transition-all ${
                  arch === '32' 
                    ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${arch === '32' ? 'border-red-500' : 'border-gray-500'}`}>
                  {arch === '32' && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> PC / Laptop
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    MoonLoader, GTA:SA PC (32-bit x86).
                    <span className="block text-green-400 text-[10px] mt-0.5">Recommended for Windows</span>
                  </p>
                </div>
              </div>

              {/* Opsi 64-BIT (Mobile) */}
              <div 
                onClick={() => setArch('64')}
                className={`cursor-pointer p-4 rounded-lg border flex items-center gap-4 transition-all ${
                  arch === '64' 
                    ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${arch === '64' ? 'border-red-500' : 'border-gray-500'}`}>
                  {arch === '64' && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Android / Mobile
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    MonetLoader Modern (64-bit ARM64).
                    <span className="block text-blue-400 text-[10px] mt-0.5">Hanya untuk HP Modern</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {status === 'error' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg flex items-center gap-3 text-green-400 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p>Berhasil compile! File .luac otomatis terdownload.</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleCompile}
            disabled={!file || isCompiling}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2
              ${!file || isCompiling
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg hover:shadow-red-500/25'
              }`}
          >
            {isCompiling ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Compile to Bytecode
              </>
            )}
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Note: Pastikan script Lua kamu bebas error syntax sebelum dicompile. <br/>
            Gunakan opsi <span className="text-gray-300">PC (32-bit)</span> jika ragu, karena lebih kompatibel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Compiler;