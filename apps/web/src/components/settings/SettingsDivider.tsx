import React from 'react';

interface SettingsDividerProps {
  className?: string;
  invisible?: boolean;
  spacing?: 'sm' | 'md' | 'lg' | 'none';
}

export function SettingsDivider({ className = "", invisible = false, spacing = 'lg' }: SettingsDividerProps) {
  const spacingClasses = {
    none: '',
    sm: 'my-2',
    md: 'my-4', 
    lg: 'my-8'
  };

  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      <hr className={`h-px w-full border-0 ${invisible ? 'bg-transparent' : 'bg-gray-200 dark:bg-border'}`} />
    </div>
  );
}
