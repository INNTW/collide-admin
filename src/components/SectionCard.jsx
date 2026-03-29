import React from 'react';
import { BRAND } from '../constants/brand';

const SectionCard = ({ title, children, icon: Icon }) => {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: BRAND.glass,
        border: `1px solid ${BRAND.glassBorder}`,
        backdropFilter: BRAND.blur,
      }}
    >
      <div className="p-4 border-b" style={{ borderColor: BRAND.glassBorder }}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={20} style={{ color: BRAND.primary }} />}
          <h2 className="text-lg font-semibold" style={{ color: BRAND.text }}>
            {title}
          </h2>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

export default SectionCard;
