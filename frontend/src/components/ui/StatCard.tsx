import type { ReactNode } from 'react';
import Card from './Card.tsx';

type StatCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  valueColor?: string;
  className?: string;
};

export default function StatCard({
  title,
  value,
  subtitle,
  valueColor = 'text-white',
  className = '',
}: StatCardProps) {
  return (
    <Card className={className}>
      <div className="text-gray-300 text-sm mb-2">{title}</div>
      <div className={`text-4xl font-extrabold mb-2 tracking-tight ${valueColor}`}>{value}</div>
      {subtitle ? <div className="text-sm text-gray-400">{subtitle}</div> : null}
    </Card>
  );
}
