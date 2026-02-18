import React from 'react';

interface OrganizationIconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OrganizationIcon({ name, size = 'md', className = "" }: OrganizationIconProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12 text-xl';
      case 'md':
        return 'w-16 h-16 text-3xl';
      case 'lg':
        return 'w-20 h-20 text-4xl';
      default:
        return 'w-16 h-16 text-3xl';
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`flex justify-center items-center flex-shrink-0 relative ${className}`}>
      <div className={`${getSizeClasses().split(' ')[0]} ${getSizeClasses().split(' ')[1]} flex-shrink-0`}>
        <div className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-xl flex justify-center items-center w-full h-full">
          <span className={`${getSizeClasses().split(' ')[2]} font-bold text-white`}>
            {getInitial(name)}
          </span>
        </div>
      </div>
    </div>
  );
}
