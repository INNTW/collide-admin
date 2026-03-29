import React from 'react';

const Badge = ({ children, color = "primary", variant = "solid" }) => {
  const colors = {
    primary: { bg: "#54CDF9", text: "#001F3F" },
    success: { bg: "#4CAF50", text: "#fff" },
    warning: { bg: "#FF9800", text: "#fff" },
    danger: { bg: "#F44336", text: "#fff" },
    info: { bg: "#2196F3", text: "#fff" },
    gray: { bg: "rgba(255,255,255,0.1)", text: "#E0E6FF" },
  };

  const c = colors[color] || colors.primary;
  const style =
    variant === "solid"
      ? { background: c.bg, color: c.text }
      : { border: `1px solid ${c.bg}`, color: c.bg };

  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
      style={style}
    >
      {children}
    </span>
  );
};

export default Badge;
