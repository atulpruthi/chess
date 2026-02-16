import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={
        `card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-6 ` +
        `shadow-[0_14px_50px_rgba(0,0,0,0.45)] hover:bg-white/[0.06] transition-colors ${className}`
      }
    >
      {children}
    </div>
  );
}
