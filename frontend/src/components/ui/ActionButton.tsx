import type { ReactNode } from 'react';

type ActionButtonProps = {
  children: ReactNode;
  gradient: string;
  onClick: () => void;
  className?: string;
};

export default function ActionButton({ children, gradient, onClick, className = '' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={
        `py-4 px-6 rounded-2xl font-semibold text-white ` +
        `bg-gradient-to-br ${gradient} shadow-lg hover:brightness-110 hover:shadow-xl transition-all ` +
        className
      }
    >
      {children}
    </button>
  );
}
