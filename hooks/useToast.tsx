import { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, XCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

const ToastComponent = ({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getContainerStyles = () => {
    const baseStyles =
      "flex items-center justify-between w-full max-w-sm bg-white shadow-lg rounded-lg pointer-events-auto px-4 py-3 border-l-4 animate-slide-in-right";
    switch (toast.type) {
      case "success":
        return `${baseStyles} border-green-500`;
      case "error":
        return `${baseStyles} border-red-500`;
      case "warning":
        return `${baseStyles} border-yellow-500`;
      case "info":
        return `${baseStyles} border-blue-500`;
      default:
        return baseStyles;
    }
  };

  return (
    <div className={getContainerStyles()}>
      <div className="flex items-center space-x-3">
        {getIcon()}
        <p className="text-sm font-medium text-gray-900">{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

// Styled container for all toasts
const ToastContainer = ({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) => {
  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-4 z-50 max-h-screen overflow-hidden pointer-events-none">
      <div className="flex flex-col items-end space-y-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto transform transition-all duration-300 ease-in-out hover:scale-105"
          >
            <ToastComponent toast={toast} onClose={onClose} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    // Limit maximum number of toasts
    setToasts((prev) => {
      const newToasts = [...prev];
      if (newToasts.length >= 3) {
        newToasts.shift(); // Remove oldest toast
      }
      return [...newToasts, { id: generateId(), message, type }];
    });
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    ToastContainer: () => (
      <ToastContainer toasts={toasts} onClose={hideToast} />
    ),
    showToast,
    hideToast,
    clearToasts,
  };
};