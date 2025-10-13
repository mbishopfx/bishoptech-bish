import React from 'react';

interface SettingRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingRow({ label, children, className = "" }: SettingRowProps) {
  return (
    <div className={`flex justify-between items-center py-2 ${className}`}>
      <span className="text-sm text-gray-700 dark:text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
