import React, { type ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  padding?: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  title,
  subtitle,
  footer,
  padding = 'p-6',
  className = '',
  children,
  headerAction,
  ...props
}) => {
  const variants = {
    default: "bg-white/5 backdrop-blur-md border border-white/10",
    elevated: "bg-[#1e1e1e] shadow-xl shadow-black/40 border border-white/5",
    bordered: "bg-transparent border-2 border-white/10"
  };

  const classes = [
    "rounded-2xl overflow-hidden text-white flex flex-col",
    variants[variant],
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      {(title || subtitle || headerAction) && (
        <div className={`px-6 pt-6 pb-2 flex justify-between items-start ${!children && !footer ? 'pb-6' : ''}`}>
          <div>
            {title && <h3 className="text-lg font-semibold leading-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div className="ml-4">{headerAction}</div>}
        </div>
      )}
      
      <div className={`flex-1 ${padding}`}>
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 bg-black/20 border-t border-white/5">
          {footer}
        </div>
      )}
    </div>
  );
};
