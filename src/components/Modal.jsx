import React from 'react';
import { X } from 'lucide-react';
import { BRAND } from '../constants/brand';

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`${sizes[size]} w-full rounded-xl p-6 shadow-2xl`}
        style={{
          background: BRAND.glass,
          border: `1px solid ${BRAND.glassBorder}`,
          backdropFilter: BRAND.blur,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: BRAND.text }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition"
          >
            <X size={20} style={{ color: BRAND.text }} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
