import { forwardRef } from 'react';

export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  type = 'button',
  onClick,
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-primary hover:bg-primary-hover text-white focus:ring-primary',
    secondary: 'bg-secondary hover:bg-secondary-hover text-white focus:ring-secondary',
    danger: 'bg-error hover:bg-error-hover text-white focus:ring-error',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-medium rounded-lg transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transform hover:scale-105
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';