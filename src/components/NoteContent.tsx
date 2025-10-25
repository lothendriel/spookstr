import { useMemo } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { parseMediaFromContent } from '@/lib/mediaParser';
import { MediaDisplay } from '@/components/MediaDisplay';
import { shouldBlockPost } from '@/lib/contentFilter';

interface NoteContentProps {
  event: NostrEvent;
  className?: string;
}

/** Parses content of text note events so that URLs and hashtags are linkified, and media is displayed inline. */
export function NoteContent({
  event,
  className,
}: NoteContentProps) {
  // Check if post should be blocked due to prohibited hashtags
  const blockCheck = shouldBlockPost(event.content);
  if (blockCheck.shouldBlock) {
    return (
      <div className={cn("text-muted-foreground italic p-4 border border-red-200 bg-red-50 rounded-lg", className)}>
        This post has been hidden due to prohibited content.
      </div>
    );
  }

  // Process content to render mentions, links, media, and hashtags
  const content = useMemo(() => {
    const text = event.content;

    // First, extract media items from content
    const mediaItems = parseMediaFromContent(text);

    // If no media found, use original logic
    if (mediaItems.length === 0) {
      return processTextContent(text);
    }

    // Process content with media replacement
    const parts: React.ReactNode[] = [];
    let processedText = text;
    let keyCounter = 0;

    // Create a Set of URLs that are being handled as media or links
    const skipUrls = new Set(mediaItems.map(item => item.url));

    // Sort media items by their position in text (earlier first)
    const sortedMedia = [...mediaItems].sort((a, b) => {
      const indexA = text.indexOf(a.url);
      const indexB = text.indexOf(b.url);
      return indexA - indexB;
    });

    // Process each media item
    for (const mediaItem of sortedMedia) {
      const url = mediaItem.url;
      const urlIndex = processedText.indexOf(url);

      if (urlIndex !== -1) {
        // Add text before the URL
        const beforeText = processedText.substring(0, urlIndex);
        if (beforeText) {
          parts.push(processTextContent(beforeText, keyCounter++));
        }

        // Add the media display
        parts.push(<MediaDisplay key={`media-${keyCounter++}`} media={mediaItem} />);

        // Remove the processed part
        processedText = processedText.substring(urlIndex + url.length);
      }
    }

    // Add remaining text
    if (processedText) {
      parts.push(processTextContent(processedText, keyCounter++));
    }

    return parts;
  }, [event]);

  return <div className={cn("break-words", className)}>{content}</div>;
}

/**
 * Processes text content to render mentions, hashtags, and links
 */
function processTextContent(text: string, keyOffset = 0): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentText = text;
  let keyCounter = keyOffset;

  // Process mentions (nostr:npub1...)
  const mentionRegex = /nostr:(npub1[a-z0-9]{58})/gi;
  let mentionMatch;
  while ((mentionMatch = mentionRegex.exec(currentText)) !== null) {
    const [fullMatch, npub] = mentionMatch;
    const matchIndex = mentionMatch.index!;

    // Add text before the mention
    if (matchIndex > 0) {
      const beforeText = currentText.substring(0, matchIndex);
      parts.push(beforeText);
    }

    // Add the mention link
    try {
      const hex = nip19.decode(npub);
      parts.push(
        <Link
          key={`mention-${keyCounter++}`}
          to={`/${npub}`}
          className="text-blue-500 hover:text-blue-600 font-medium"
        >
          @{genUserName(hex)}
        </Link>
      );
    } catch {
      // If mention is invalid, just show the raw text
      parts.push(fullMatch);
    }

    // Remove the processed part
    currentText = currentText.substring(matchIndex + fullMatch.length);
  }

  // Process hashtags (#hashtag)
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  let hashtagMatch;
  const processedHashtags = new Set<string>();
  while ((hashtagMatch = hashtagRegex.exec(currentText)) !== null) {
    const [fullMatch, hashtag] = hashtagMatch;
    const matchIndex = hashtagMatch.index!;

    // Add text before the hashtag
    if (matchIndex > 0) {
      const beforeText = currentText.substring(0, matchIndex);
      parts.push(beforeText);
    }

    // Add the hashtag link (only if not already processed)
    const hashtagLower = hashtag.toLowerCase();
    if (!processedHashtags.has(hashtagLower)) {
      processedHashtags.add(hashtagLower);
      parts.push(
        <Link
          key={`hashtag-${keyCounter++}`}
          to={`/t/${hashtag}`}
          className="text-blue-500 hover:text-blue-600 font-medium"
        >
          #{hashtag}
        </Link>
      );
    } else {
      parts.push(fullMatch);
    }

    // Remove the processed part
    currentText = currentText.substring(matchIndex + fullMatch.length);
  }

  // Process URLs (http/https)
  const urlRegex = /https?:\/\/[^\s]+/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(currentText)) !== null) {
    const [fullMatch, url] = urlMatch;
    const matchIndex = urlMatch.index!;

    // Add text before the URL
    if (matchIndex > 0) {
      const beforeText = currentText.substring(0, matchIndex);
      parts.push(beforeText);
    }

    // Add the URL link
    parts.push(
      <a
        key={`url-${keyCounter++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 underline"
      >
        {url}
      </a>
    );

    // Remove the processed part
    currentText = currentText.substring(matchIndex + fullMatch.length);
  }

  // Add remaining text
  if (currentText) {
    parts.push(currentText);
  }

  return <>{parts}</>;
}