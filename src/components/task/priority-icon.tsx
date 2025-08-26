import type { Priority } from '@/lib/types';
import { ArrowDown, ArrowUp, Minus, type LucideProps } from 'lucide-react';
import React from 'react';

interface PriorityIconProps extends LucideProps {
  priority: Priority;
}

export function PriorityIcon({ priority, ...props }: PriorityIconProps) {
  switch (priority) {
    case 'High':
      return <ArrowUp {...props} />;
    case 'Medium':
      return <Minus {...props} />;
    case 'Low':
      return <ArrowDown {...props} />;
    default:
      return null;
  }
}
