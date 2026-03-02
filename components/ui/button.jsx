import React from 'react';
import { cn } from '@/lib/utils';

const Button = React.forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  children, 
  ...props 
}, ref) => {
  const variants = {
    default: 'bg-black text-white hover:bg-gray-800 active:bg-gray-900 active:scale-95 shadow-md active:shadow-sm',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 active:scale-95 shadow-md active:shadow-sm',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 shadow-md active:shadow-sm',
    ghost: 'hover:bg-gray-100 active:bg-gray-200 active:scale-95',
    destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 active:scale-95 shadow-md active:shadow-sm'
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
