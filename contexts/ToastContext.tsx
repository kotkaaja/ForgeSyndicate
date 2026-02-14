import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const icons = {
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-blue-400 shrink-0" />,
};

const styles = {
  success: 'border-green-700/60 bg-[#0f1f14] text-green-300',
  error:   'border-red-700/60 bg-[#1f0f0f] text-red-300',
  info:    'border-blue-700/60 bg-[#0f141f] text-blue-300',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast, i) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium max-w-xs
              animate-in slide-in-from-bottom-3 fade-in duration-300
              ${styles[toast.type]}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {icons[toast.type]}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => remove(toast.id)} className="opacity-50 hover:opacity-100 transition-opacity ml-1">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};