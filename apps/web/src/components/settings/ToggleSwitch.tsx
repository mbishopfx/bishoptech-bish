'use client';

import React from 'react';
import { Switch } from '@rift/ui/switch';
import { cn } from '@rift/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className = '',
}: ToggleSwitchProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        {label && (
          <span className="text-sm font-medium leading-none text-foreground">
            {label}
          </span>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
