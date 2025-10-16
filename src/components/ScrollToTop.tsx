import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  className?: string;
}

export function ScrollToTop({ className }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled = document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      // Show button when user scrolls down more than 300px
      setIsVisible(scrolled > 300);
      
      // Check if user is at the very top
      setIsAtTop(scrolled < 50);
    };

    window.addEventListener('scroll', toggleVisibility);
    
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Responsive sizes based on screen size
  const getButtonSize = () => {
    const width = window.innerWidth;
    if (width < 640) { // Mobile
      return 'h-12 w-12'; // 48px
    } else if (width < 1024) { // Tablet
      return 'h-14 w-14'; // 56px
    } else { // Desktop
      return 'h-16 w-16'; // 64px
    }
  };

  const getIconSize = () => {
    const width = window.innerWidth;
    if (width < 640) { // Mobile
      return 20; // 20px
    } else if (width < 1024) { // Tablet
      return 24; // 24px
    } else { // Desktop
      return 28; // 28px
    }
  };

  const [buttonSize, setButtonSize] = useState(getButtonSize());
  const [iconSize, setIconSize] = useState(getIconSize());

  useEffect(() => {
    const handleResize = () => {
      setButtonSize(getButtonSize());
      setIconSize(getIconSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Button
      onClick={scrollToTop}
      className={cn(
        // Fixed positioning
        'fixed bottom-6 right-6 z-50',
        
        // Responsive sizing
        buttonSize,
        
        // Smooth transitions
        'transition-all duration-300 ease-in-out',
        
        // Visibility animations
        'transform-gpu',
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-20 opacity-0 pointer-events-none',
        
        // Visual styling
        'bg-lime-500 hover:bg-lime-600',
        'text-white hover:text-white',
        'shadow-lg hover:shadow-xl',
        'rounded-full',
        
        // Border effects
        'border-2 border-lime-400/30 hover:border-lime-400/50',
        
        // Focus states
        'focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-2',
        
        // Disabled state when at top
        isAtTop && 'opacity-50 cursor-not-allowed',
        
        className
      )}
      disabled={isAtTop}
      aria-label="Scroll to top"
    >
      <ChevronUp 
        className={cn(
          'transition-transform duration-200',
          isVisible && !isAtTop && 'hover:scale-110'
        )} 
        size={iconSize} 
        strokeWidth={3}
      />
    </Button>
  );
}