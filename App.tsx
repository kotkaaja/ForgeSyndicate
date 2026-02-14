import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Mods from './pages/Mods';
import ModDetail from './pages/ModDetail';
import Services from './pages/Services';
import Community from './pages/Community';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Obfuscator from './pages/Obfuscator';
import Compiler from './pages/Compiler';
import { ToastProvider } from './contexts/ToastContext';

const Footer = () => (
  <footer className="bg-[#0a0a0a] border-t border-zinc-800/50 py-7 mt-auto">
    <div className="max-w-7xl mx-auto px-4 text-center text-zinc-600 text-xs">
      <p className="mb-1">&copy; {new Date().getFullYear()} Forge Syndicate. All rights reserved.</p>
      <p className="text-zinc-700 text-[10px]">By Kotkaaja.</p>
    </div>
  </footer>
);

const App: React.FC = () => {
  return (
    <ToastProvider>
      <HashRouter>
        <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-zinc-200 font-sans">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/mods" element={<Mods />} />
              <Route path="/mod/:id" element={<ModDetail />} />
              <Route path="/services" element={<Services />} />
              <Route path="/tools/obfuscator" element={<Obfuscator />} />
              <Route path="/tools/compiler" element={<Compiler />} />
              <Route path="/community" element={<Community />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </ToastProvider>
  );
};

export default App;