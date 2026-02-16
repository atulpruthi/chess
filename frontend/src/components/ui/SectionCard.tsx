import type { ReactNode } from 'react';
import Card from './Card.tsx';

type SectionCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({ title, children, className = '' }: SectionCardProps) {
  return (
    <Card className={className}>
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      {children}
    </Card>
  );
}
