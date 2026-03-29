import React from 'react';
import { BRAND } from '../constants/brand';

const Input = ({ label, value, onChange, type = "text", placeholder, error, ...rest }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-lg text-white transition focus:outline-none focus:ring-2"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: error
            ? `1px solid ${BRAND.danger}`
            : `1px solid ${BRAND.glassBorder}`,
          focusRing: BRAND.primary,
        }}
        {...rest}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: BRAND.danger }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
