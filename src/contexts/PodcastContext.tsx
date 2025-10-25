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
  moveIframeToPopout: () => void;
  moveIframeToMain: () => void;
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

  const moveIframeToPopout = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const popoutContainer = document.getElementById('popout-iframe-container');
      if (popoutContainer && iframe.parentNode !== popoutContainer) {
        popoutContainer.innerHTML = '';
        popoutContainer.appendChild(iframe);
      }
    }
  };

  const moveIframeToMain = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const mainContainer = document.getElementById('main-iframe-container');
      if (mainContainer && iframe.parentNode !== mainContainer) {
        mainContainer.innerHTML = '';
        mainContainer.appendChild(iframe);
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