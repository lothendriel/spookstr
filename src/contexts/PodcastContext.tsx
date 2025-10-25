import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';

interface Podcast {
  title: string;
  src: string;
}

interface PodcastContextType {
  currentPodcast: Podcast | null;
  isPlaying: boolean;
  isPoppedOut: boolean;
  playPodcast: (podcast: Podcast) => void;
  pausePodcast: () => void;
  togglePlayPause: () => void;
  togglePopOut: () => void;
  closePopOut: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  moveIframeToPopout: (currentIndex: number) => void;
  moveIframeToMain: (currentIndex: number) => void;
}

const PodcastContext = createContext<PodcastContextType | undefined>(undefined);

export function PodcastProvider({ children }: { children: ReactNode }) {
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const playPodcast = (podcast: Podcast) => {
    setCurrentPodcast(podcast);
    setIsPlaying(true);
  };

  const pausePodcast = () => {
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const togglePopOut = () => {
    setIsPoppedOut(prev => !prev);
  };

  const closePopOut = () => {
    setIsPoppedOut(false);
    setIsPlaying(false);
    setCurrentPodcast(null);
  };

  const moveIframeToPopout = (currentIndex: number) => {
    const originalIframe = document.querySelector(`iframe[data-podcast-index="${currentIndex}"]`) as HTMLIFrameElement;
    const popoutContainer = document.getElementById('popout-iframe-container');

    if (originalIframe && popoutContainer && originalIframe.parentNode !== popoutContainer) {
      // Store the original parent for later
      const originalParent = originalIframe.parentNode;

      // Move the iframe to popout
      originalIframe.classList.remove('invisible');
      originalIframe.style.height = '120px'; // Set minimal height for popout
      popoutContainer.innerHTML = '';
      popoutContainer.appendChild(originalIframe);

      // Update reference
      iframeRef.current = originalIframe;

      // Store original parent and height for return
      (originalIframe as any)._originalParent = originalParent;
      (originalIframe as any)._originalHeight = '400px';
    }
  };

  const moveIframeToMain = (currentIndex: number) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const originalParent = (iframe as any)._originalParent;
    const originalHeight = (iframe as any)._originalHeight;

    if (originalParent && iframe.parentNode !== originalParent) {
      // Restore original height
      iframe.style.height = originalHeight || '400px';

      // Move back to original position
      originalParent.appendChild(iframe);

      // Clean up stored data
      delete (iframe as any)._originalParent;
      delete (iframe as any)._originalHeight;
    }
  };

  return (
    <PodcastContext.Provider value={{
      currentPodcast,
      isPlaying,
      isPoppedOut,
      playPodcast,
      pausePodcast,
      togglePlayPause,
      togglePopOut,
      closePopOut,
      iframeRef,
      moveIframeToPopout,
      moveIframeToMain,
    }}>
      {children}
    </PodcastContext.Provider>
  );
}

export function usePodcast() {
  const context = useContext(PodcastContext);
  if (context === undefined) {
    throw new Error('usePodcast must be used within a PodcastProvider');
  }
  return context;
}