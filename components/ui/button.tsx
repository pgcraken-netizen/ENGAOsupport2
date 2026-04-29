'use client';

import { cn } from '@/lib/utils/cn';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'link' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'bg-engao-green text-white hover:bg-engao-green-dark',
  secondary: 'bg-engao-bg text-engao-text hover:bg-engao-border',
  destructive: 'bg-engao-danger text-white hover:bg-red-700',
  ghost: 'hover:bg-engao-bg text-engao-sub',
  link: 'text-engao-green underline-offset-4 hover:underline',
  outline: 'border border-engao-border bg-white hover:bg-engao-bg text-engao-sub',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-engao-green',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
