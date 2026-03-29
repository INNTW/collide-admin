import React from 'react';
import { BRAND } from '../constants/brand';

const EmptyState = ({ icon: Icon, title, message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon size={48} style={{ color: BRAND.primary }} className="mb-4 opacity-50" />}
      <h3 className="text-lg font-semibold mb-2" style={{ color: BRAND.text }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>
        {message}
      </p>
    </div>
  );
};

export default EmptyState;
