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
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const popoutContainer = document.getElementById('popout-iframe-container');
      if (popoutContainer && iframe.parentNode !== popoutContainer) {
        // Make iframe visible again
        iframe.classList.remove('invisible');
        // Clone the iframe to preserve its state
        const clonedIframe = iframe.cloneNode(true) as HTMLIFrameElement;
        iframeRef.current = clonedIframe;
        popoutContainer.innerHTML = '';
        popoutContainer.appendChild(clonedIframe);
      }
    }
  };

  const moveIframeToMain = (currentIndex: number) => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const originalIframe = document.querySelector(`iframe[data-podcast-index="${currentIndex}"]`) as HTMLIFrameElement;
      if (originalIframe && originalIframe !== iframe) {
        // Replace the original iframe with the popped out one to preserve state
        const parent = originalIframe.parentNode;
        if (parent) {
          parent.replaceChild(iframe, originalIframe);
          // Update the data attribute
          iframe.setAttribute('data-podcast-index', currentIndex.toString());
        }
      }
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