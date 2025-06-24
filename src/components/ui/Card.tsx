import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  onClick 
}) => {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div 
      className={`bg-gray-800 rounded-lg shadow-sm border border-gray-700 ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`border-b border-gray-700 pb-3 sm:pb-4 mb-4 sm:mb-6 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <h3 className={`text-base sm:text-lg font-semibold text-gray-100 ${className}`}>
    {children}
  </h3>
);