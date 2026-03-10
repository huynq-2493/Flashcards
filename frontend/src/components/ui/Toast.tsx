import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const toastColors: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

let addToastFn: (type: ToastType, message: string) => void = () => {};

// eslint-disable-next-line react-refresh/only-export-components
export function toast(type: ToastType, message: string) {
  addToastFn(type, message);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (type, message) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
    return () => {
      addToastFn = () => {};
    };
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'flex items-start gap-2 px-4 py-3 rounded-lg border shadow-md animate-slide-up',
            toastColors[t.type],
          ].join(' ')}
        >
          <span className="font-bold mt-0.5">{toastIcons[t.type]}</span>
          <p className="text-sm">{t.message}</p>
        </div>
      ))}
    </div>,
    document.body,
  );
}
