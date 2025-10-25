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

    if (originalIframe && popoutContainer) {
      // Hide the original iframe in the carousel
      originalIframe.classList.add('invisible');

      // Create a new iframe for the popout with the same source
      const popoutIframe = document.createElement('iframe');
      popoutIframe.allow = 'autoplay';
      popoutIframe.width = '100%';
      popoutIframe.height = '120';
      popoutIframe.src = originalIframe.src;
      popoutIframe.frameBorder = '0';
      popoutIframe.style.backgroundColor = 'transparent';

      // Clear and add to popout container
      popoutContainer.innerHTML = '';
      popoutContainer.appendChild(popoutIframe);

      // Update reference
      iframeRef.current = popoutIframe;

      // Store reference to original iframe and index
      (popoutIframe as any)._originalIframe = originalIframe;
      (popoutIframe as any)._currentIndex = currentIndex;
    }
  };

  const moveIframeToMain = (currentIndex: number) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const originalIframe = (iframe as any)._originalIframe;
    const storedIndex = (iframe as any)._currentIndex;

    if (originalIframe && storedIndex === currentIndex) {
      // Show the original iframe again
      originalIframe.classList.remove('invisible');

      // Clear the popout container
      const popoutContainer = document.getElementById('popout-iframe-container');
      if (popoutContainer) {
        popoutContainer.innerHTML = '';
      }

      // Reset reference
      iframeRef.current = null;
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