import React from 'react';
import { BRAND } from '../constants/brand';

const Btn = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  disabled = false,
  type = "button",
}) => {
  const variants = {
    primary: {
      bg: BRAND.primary,
      text: "#001F3F",
      hover: "#3BB8E8",
    },
    secondary: {
      bg: "rgba(255,255,255,0.1)",
      text: BRAND.text,
      hover: "rgba(255,255,255,0.15)",
    },
    ghost: {
      bg: "transparent",
      text: BRAND.text,
      hover: "rgba(255,255,255,0.1)",
    },
    danger: {
      bg: BRAND.danger,
      text: "#fff",
      hover: "#E53935",
    },
    success: {
      bg: BRAND.success,
      text: "#fff",
      hover: "#45A049",
    },
  };

  const v = variants[variant] || variants.primary;
  const sizes_map = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition ${
        sizes_map[size]
      } ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{
        background: v.bg,
        color: v.text,
      }}
      onMouseEnter={(e) => !disabled && (e.target.style.background = v.hover)}
      onMouseLeave={(e) => (e.target.style.background = v.bg)}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Btn;
