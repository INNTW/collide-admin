import React from 'react';
import { BRAND } from '../constants/brand';

const Select = ({ label, value, onChange, options, placeholder }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 rounded-lg text-white transition focus:outline-none focus:ring-2"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${BRAND.glassBorder}`,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
