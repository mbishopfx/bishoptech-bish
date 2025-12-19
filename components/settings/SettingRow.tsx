import React from 'react';

interface SettingRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}

export function SettingRow({ label, children, className = "", labelClassName = "" }: SettingRowProps) {
  return (
    <div className={`grid py-2 ${className}`}>
      <span className={`text-sm text-gray-700 dark:text-text-secondary pb-1 ${labelClassName}`}>{label}</span>
      {children}
    </div>
  );
}
