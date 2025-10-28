import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';

interface Podcast {
  title: string;
  embedCode: string;
}

interface PodcastContextType {
  currentPodcast: Podcast | null;
  isPlaying: boolean;
  isPoppedOut: boolean;
  playbackStartTime: number | null;
  playPodcast: (podcast: Podcast) => void;
  pausePodcast: () => void;
  togglePlayPause: () => void;
  togglePopOut: () => void;
  closePopOut: () => void;
  iframeKey: number;
  iframeContainerRef: React.RefObject<HTMLDivElement>;
}

const PodcastContext = createContext<PodcastContextType | undefined>(undefined);

export function PodcastProvider({ children }: { children: ReactNode }) {
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const playPodcast = (podcast: Podcast) => {
    // If switching to a different podcast, reset the iframe
    if (currentPodcast?.title !== podcast.title) {
      setIframeKey(prev => prev + 1);
      setPlaybackStartTime(Date.now());
    }
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
    // When popping out, DON'T reload iframe - this keeps playback state
    setIsPoppedOut(prev => !prev);
  };

  const closePopOut = () => {
    setIsPoppedOut(false);
    // Don't stop playback or clear podcast when closing popout
    // This allows the player to continue in the carousel
  };

  return (
    <PodcastContext.Provider value={{
      currentPodcast,
      isPlaying,
      isPoppedOut,
      playbackStartTime,
      playPodcast,
      pausePodcast,
      togglePlayPause,
      togglePopOut,
      closePopOut,
      iframeKey,
      iframeContainerRef,
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