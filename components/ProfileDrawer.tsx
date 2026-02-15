import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import UserProfileCard from './UserProfileCard';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full z-[100] w-full sm:w-[380px] bg-[#0f0f0f] border-l border-zinc-800/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 bg-[#0f0f0f] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white font-black text-sm uppercase tracking-widest">Profile</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#166534 #18181b' }}>
          <UserProfileCard />
        </div>
      </div>
    </>
  );
};

export default ProfileDrawer;