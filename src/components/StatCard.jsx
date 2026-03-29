import React from 'react';
import { BRAND } from '../constants/brand';

const StatCard = ({ icon: Icon, label, value, trend, color = "primary" }) => {
  const colors = {
    primary: BRAND.primary,
    success: BRAND.success,
    warning: BRAND.warning,
    danger: BRAND.danger,
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: BRAND.glass,
        border: `1px solid ${BRAND.glassBorder}`,
        backdropFilter: BRAND.blur,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "rgba(224,230,255,0.7)" }}>
            {label}
          </p>
          <p className="text-2xl font-bold" style={{ color: colors[color] }}>
            {value}
          </p>
        </div>
        {Icon && (
          <Icon size={24} style={{ color: colors[color] }} className="opacity-50" />
        )}
      </div>
      {trend && (
        <p className="text-xs mt-2" style={{ color: trend.positive ? BRAND.success : BRAND.danger }}>
          {trend.positive ? "+" : ""}{trend.value}% vs last period
        </p>
      )}
    </div>
  );
};

export default StatCard;
