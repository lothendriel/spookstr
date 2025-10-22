import { ReactNode } from 'react';

interface ScrollableLayoutProps {
  leftSidebar?: ReactNode;
  mainContent: ReactNode;
  rightSidebar?: ReactNode;
  className?: string;
}

/**
 * A layout component that makes the middle column scrollable while keeping
 * left and right sidebars fixed on desktop (lg breakpoint and above).
 * On mobile, it behaves as a normal vertical layout.
 */
export function ScrollableLayout({
  leftSidebar,
  mainContent,
  rightSidebar,
  className = ''
}: ScrollableLayoutProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Mobile layout - everything stacks vertically */}
      <div className="lg:hidden">
        {leftSidebar}
        {mainContent}
        {rightSidebar}
      </div>

      {/* Desktop layout - fixed sidebars with scrollable middle */}
      <div className="hidden lg:block">
        <div className="flex gap-8 h-[calc(100vh-8rem)]">
          {/* Left Sidebar */}
          {leftSidebar && (
            <div className="w-1/4">
              <div className="h-full overflow-y-auto pr-2">
                {leftSidebar}
              </div>
            </div>
          )}

          {/* Main Content - scrollable */}
          <div className="w-2/4">
            <div className="h-full overflow-y-auto px-2">
              {mainContent}
            </div>
          </div>

          {/* Right Sidebar */}
          {rightSidebar && (
            <div className="w-1/4">
              <div className="h-full overflow-y-auto pl-2">
                {rightSidebar}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}