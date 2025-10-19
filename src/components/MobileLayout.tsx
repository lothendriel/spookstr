import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MobileLayout({ children, className }: MobileLayoutProps) {
  return (
    <div className={cn(
      // Mobile/tablet layout - hidden on desktop
      'xl:hidden',

      // Full viewport height
      'min-h-screen',

      // Spacing
      'p-4',

      // Single column layout
      'flex flex-col',

      className
    )}>
      {/* Mobile Header */}
      {children[0]} {/* SpookstrHeader */}

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {children[1]} {/* Main feed content */}
      </main>
    </div>
  );
}