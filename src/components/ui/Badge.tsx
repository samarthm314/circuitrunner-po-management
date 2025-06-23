import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'sm' 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-900/50 text-green-300 border border-green-700',
    warning: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
    danger: 'bg-red-900/50 text-red-300 border border-red-700',
    info: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  };
  
  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};