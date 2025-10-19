import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DesktopLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DesktopLayout({ children, className }: DesktopLayoutProps) {
  return (
    <div className={cn(
      // Desktop layout - hidden on mobile/tablet
      'hidden xl:flex',

      // Full viewport height
      'min-h-screen',

      // Fixed positioning for sidebars
      'relative',

      // Spacing
      'p-4',
      className
    )}>
      {/* Left Sidebar - Fixed */}
      <div className="w-80 flex-shrink-0 fixed left-4 top-4 bottom-4 overflow-y-auto">
        <div className="space-y-6">
          {children[0]} {/* CreateParanormalPost */}
          {children[1]} {/* DeveloperTip */}
        </div>
      </div>

      {/* Center Content - Scrollable */}
      <div className="flex-1 mx-80"> {/* Offset for sidebars */}
        <div className="max-w-2xl mx-auto overflow-y-auto h-screen">
          {children[2]} {/* Main Feed */}
        </div>
      </div>

      {/* Right Sidebar - Fixed */}
      <div className="w-80 flex-shrink-0 fixed right-4 top-4 bottom-4 overflow-y-auto">
        <div className="space-y-6">
          {children[3]} {/* Additional content if needed */}
        </div>
      </div>
    </div>
  );
}