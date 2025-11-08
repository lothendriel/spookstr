/**
 * Image Lazy Loading Component
 * Optimizes image loading with intersection observer and proper error handling
 * Supports placeholder images, loading states, and performance optimizations
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './LoadingComponents';
import { ErrorAlert } from './ErrorBoundary';

interface ImageLazyLoadProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  blurDataURL?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  aspectRatio?: string;
  zoomable?: boolean;
  onClick?: () => void;
}

export function ImageLazyLoad({
  src,
  alt,
  className,
  placeholder,
  fallback = '/images/fallback-image.png',
  width,
  height,
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
  blurDataURL,
  objectFit = 'cover',
  aspectRatio,
  zoomable = false,
  onClick
}: ImageLazyLoadProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback((error: Event) => {
    setIsLoading(false);
    setHasError(true);
    if (fallback) {
      setImageSrc(fallback);
    }
    onError?.(new Error(`Failed to load image: ${src}`));
  }, [src, fallback, onError]);

  // Load image with intersection observer
  useEffect(() => {
    if (!src || priority) {
      setImageSrc(src);
      return;
    }

    const img = imgRef.current;
    if (!img) return;

    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.01
      }
    );

    observer.observe(img);

    return () => {
      observer.unobserve(img);
    };
  }, [src, priority]);

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  // Generate style object
  const style = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
    aspectRatio,
    objectFit,
  };

  const containerClasses = cn(
    'relative overflow-hidden',
    'bg-lime-500/10',
    aspectRatio && 'aspect-video',
    !aspectRatio && !height && !width && 'w-full h-auto',
    zoomable && 'cursor-zoom-in hover:opacity-90 transition-opacity',
    className
  );

  return (
    <div className={containerClasses} onClick={onClick}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0">
          <Skeleton 
            variant="custom" 
            className="w-full h-full"
            style={style}
          />
        </div>
      )}

      {/* Blur placeholder */}
      {blurDataURL && isLoading && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          style={{ ...style, opacity: 0.3 }}
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading={priority ? 'eager' : loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          hasError ? 'hidden' : 'block'
        )}
        style={style}
        draggable="false"
      />

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-lime-500/10">
          <div className="text-center p-4">
            <div className="text-lime-500/60 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-lime-300/70">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500" />
        </div>
      )}
    </div>
  );
}

/**
 * Gallery component with lazy loading
 */
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    thumbnail?: string;
    title?: string;
  }>;
  className?: string;
  columns?: number;
  gap?: number;
  onImageClick?: (index: number) => void;
}

export function ImageGallery({
  images,
  className,
  columns = 3,
  gap = 4,
  onImageClick
}: ImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  }, []);

  return (
    <div 
      className={cn(
        'grid',
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      {images.map((image, index) => (
        <div 
          key={index}
          className={cn(
            'relative overflow-hidden rounded-lg',
            'bg-lime-500/10',
            'cursor-pointer hover:opacity-90 transition-opacity',
            'aspect-square'
          )}
          onClick={() => onImageClick?.(index)}
        >
          <ImageLazyLoad
            src={image.thumbnail || image.src}
            alt={image.alt}
            className="w-full h-full"
            onLoad={() => handleImageLoad(index)}
            priority={index < 6} // Load first 6 images eagerly
          />
          
          {/* Image title overlay */}
          {image.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs truncate">{image.title}</p>
            </div>
          )}
          
          {/* Loading indicator */}
          {!loadedImages.has(index) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lime-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Avatar with lazy loading
 */
interface LazyAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

export function LazyAvatar({
  src,
  alt,
  fallback,
  className,
  size = 'md',
  onClick
}: LazyAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div 
      className={cn(
        'relative rounded-full bg-lime-500/20 overflow-hidden',
        sizeClasses[size],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <ImageLazyLoad
        src={src || ''}
        alt={alt}
        fallback={fallback}
        className="w-full h-full"
        objectFit="cover"
        priority={true} // Avatars should load immediately
      />
    </div>
  );
}

/**
 * Background image with lazy loading
 */
interface LazyBackgroundProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
}

export function LazyBackground({
  src,
  className,
  children,
  overlay = true,
  overlayOpacity = 0.4
}: LazyBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <ImageLazyLoad
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full"
        objectFit="cover"
        onLoad={() => setIsLoaded(true)}
        priority={true}
      />
      
      {/* Overlay */}
      {overlay && isLoaded && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * Hook for preloading images
 */
export function useImagePreloader() {
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(async (images: string[]): Promise<void> => {
    try {
      await Promise.all(images.map(preloadImage));
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  }, [preloadImage]);

  return { preloadImage, preloadImages };
}

export default ImageLazyLoad;