import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121212]";
  
  const variants = {
    primary: "bg-[var(--primary-color)] text-[#1a1a1a] hover:opacity-90 active:scale-95 focus:ring-[var(--primary-color)]",
    secondary: "bg-white/10 text-white hover:bg-white/20 active:scale-95 focus:ring-white/50",
    ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-white/5 active:scale-95",
    danger: "bg-red-500/20 text-red-500 hover:bg-red-500/30 active:scale-95 focus:ring-red-500/50"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm rounded-xl gap-2",
    lg: "px-6 py-3 text-base rounded-2xl gap-2.5"
  };

  const isDisabled = disabled || loading;
  const classes = [
    baseStyles,
    variants[variant],
    sizes[size],
    fullWidth ? "w-full" : "",
    isDisabled ? "opacity-50 cursor-not-allowed active:scale-100" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {loading && <Loader2 className="animate-spin w-4 h-4" />}
      {!loading && Icon && <Icon className={size === 'sm' ? "w-4 h-4" : size === 'lg' ? "w-6 h-6" : "w-5 h-5"} />}
      {children}
    </button>
  );
};
