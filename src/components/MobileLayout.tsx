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
      
      // Background and spacing
      'bg-gradient-to-br from-black via-green-950/20 to-black p-4',
      
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