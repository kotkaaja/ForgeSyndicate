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

// Simple Footer
const Footer = () => (
  <footer className="bg-[#0f0f0f] border-t border-zinc-800 py-8 mt-auto">
    <div className="max-w-7xl mx-auto px-4 text-center text-zinc-500 text-sm">
      <p className="mb-2">&copy; {new Date().getFullYear()} Forge Syndicate.</p>
      <p className="text-xs text-zinc-600">By Kotkaaja.</p>
    </div>
  </footer>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen bg-[#0f0f0f] text-zinc-200 font-sans">
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
  );
};

export default App;