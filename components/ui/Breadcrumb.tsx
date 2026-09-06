import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 dark:text-slate-100 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
