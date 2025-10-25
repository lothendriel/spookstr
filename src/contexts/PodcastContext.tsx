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
      // Store the original parent and next sibling for proper reinsertion
      const originalParent = originalIframe.parentNode;
      const nextSibling = originalIframe.nextSibling;

      // Create a new iframe with the same src to maintain playback state
      const newIframe = document.createElement('iframe');
      newIframe.allow = 'autoplay';
      newIframe.width = '100%';
      newIframe.height = '120'; // Minimal height for popout
      newIframe.src = originalIframe.src;
      newIframe.frameBorder = '0';
      newIframe.setAttribute('data-podcast-index', currentIndex.toString());

      // Replace the original iframe with the new one in the carousel
      if (originalParent) {
        originalParent.removeChild(originalIframe);
        originalParent.insertBefore(newIframe, nextSibling);
      }

      // Add the original iframe to popout (this maintains playback state)
      originalIframe.style.height = '120px';
      originalIframe.classList.remove('invisible');
      popoutContainer.innerHTML = '';
      popoutContainer.appendChild(originalIframe);

      // Update reference
      iframeRef.current = originalIframe;

      // Store original position info for return
      (originalIframe as any)._originalParent = originalParent;
      (originalIframe as any)._nextSibling = nextSibling;
      (originalIframe as any)._originalHeight = '400px';
    }
  };

  const moveIframeToMain = (currentIndex: number) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const originalParent = (iframe as any)._originalParent;
    const nextSibling = (iframe as any)._nextSibling;
    const originalHeight = (iframe as any)._originalHeight;

    if (originalParent) {
      // Find the replacement iframe in the carousel
      const replacementIframe = originalParent.querySelector(`iframe[data-podcast-index="${currentIndex}"]`) as HTMLIFrameElement;

      if (replacementIframe && replacementIframe !== iframe) {
        // Restore original height
        iframe.style.height = originalHeight || '400px';

        // Replace the replacement iframe with the original (maintaining playback state)
        originalParent.removeChild(replacementIframe);
        originalParent.insertBefore(iframe, nextSibling);

        // Clean up stored data
        delete (iframe as any)._originalParent;
        delete (iframe as any)._nextSibling;
        delete (iframe as any)._originalHeight;
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