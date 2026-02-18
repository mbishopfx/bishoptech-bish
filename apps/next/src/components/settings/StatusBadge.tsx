import React from 'react';

interface StatusBadgeProps {
  status: 'enabled' | 'disabled' | 'not-required';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'enabled':
        return 'text-emerald-700 dark:text-emerald-300 bg-accent-green dark:bg-accent-green-2';
      case 'disabled':
        return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/20';
      case 'not-required':
        return 'text-gray-500 dark:text-text-muted bg-gray-100 dark:bg-popover-secondary';
      default:
        return 'text-gray-500 dark:text-text-muted bg-gray-100 dark:bg-popover-secondary';
    }
  };

  return (
    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getStatusStyles()}`}>
      {children}
    </span>
  );
}
