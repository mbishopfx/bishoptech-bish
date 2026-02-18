import React from 'react';

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, children, className = "" }: SettingsSectionProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex flex-col mb-5">
        <div className="flex items-center">
          <p className="font-semibold text-base leading-6 text-gray-900 dark:text-white">{title}</p>
        </div>
        <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
