import { useMemo } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { parseMediaFromContent } from '@/lib/mediaParser';
import { MediaDisplay } from '@/components/MediaDisplay';

interface NoteContentProps {
  event: NostrEvent;
  className?: string;
}

/** Parses content of text note events so that URLs and hashtags are linkified, and media is displayed inline. */
export function NoteContent({
  event,
  className,
}: NoteContentProps) {
  // Process the content to render mentions, links, media, and hashtags
  const content = useMemo(() => {
    const text = event.content;

    // First, extract media items from the content
    const mediaItems = parseMediaFromContent(text);

    // If no media found, use the original logic
    if (mediaItems.length === 0) {
      return processTextContent(text);
    }

    // Process content with media replacement
    const parts: React.ReactNode[] = [];
    let processedText = text;
    let keyCounter = 0;

    // Sort media items by their position in the text (earlier first)
    const sortedMedia = [...mediaItems].sort((a, b) => {
      const indexA = text.indexOf(a.url);
      const indexB = text.indexOf(b.url);
      return indexA - indexB;
    });

    // Process each media item and the text around it
    sortedMedia.forEach((media) => {
      const mediaIndex = processedText.indexOf(media.url);

      if (mediaIndex > 0) {
        // Add text before the media URL
        const beforeText = processedText.substring(0, mediaIndex);
        parts.push(...processTextContent(beforeText, keyCounter));
        keyCounter += beforeText.split(/\s+/).length; // Rough estimate for key increment
      }

      // Add the media display component
      parts.push(
        <MediaDisplay
          key={`media-${keyCounter++}`}
          media={media}
        />
      );

      // Remove the processed part from the text
      processedText = processedText.substring(mediaIndex + media.url.length);
    });

    // Add any remaining text
    if (processedText.trim()) {
      parts.push(...processTextContent(processedText, keyCounter));
    }

    return parts;
  }, [event]);

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {content.length > 0 ? content : event.content}
    </div>
  );
}

// Helper function to process text content (URLs, mentions, hashtags)
function processTextContent(text: string, keyOffset = 0): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // Regex to find URLs, Nostr references, and hashtags
  // Exclude URLs that are already handled as media
  const regex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|webm|mov|avi|mkv|flv|mp3|wav|ogg|flac|m4a|aac)(?:\?[^\s]*)?)|(https?:\/\/[^\s]+)|nostr:(npub1|note1|nprofile1|nevent1)([023456789acdefghjklmnpqrstuvwxyz]+)|(#\w+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = keyOffset;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, mediaUrl, mediaExt, regularUrl, nostrPrefix, nostrData, hashtag] = match;
    const index = match.index;

    // Add text before this match
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }

    if (mediaUrl) {
      // This is a media URL, but it wasn't caught by the media parser
      // Treat it as a regular URL
      parts.push(
        <a
          key={`url-${keyCounter++}`}
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {mediaUrl}
        </a>
      );
    } else if (regularUrl) {
      // Handle regular URLs
      parts.push(
        <a
          key={`url-${keyCounter++}`}
          href={regularUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {regularUrl}
        </a>
      );
    } else if (nostrPrefix && nostrData) {
      // Handle Nostr references
      try {
        const nostrId = `${nostrPrefix}${nostrData}`;
        const decoded = nip19.decode(nostrId);

        if (decoded.type === 'npub') {
          const pubkey = decoded.data;
          parts.push(
            <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
          );
        } else {
          // For other types, just show as a link
          parts.push(
            <Link
              key={`nostr-${keyCounter++}`}
              to={`/${nostrId}`}
              className="text-blue-500 hover:underline"
            >
              {fullMatch}
            </Link>
          );
        }
      } catch {
        // If decoding fails, just render as text
        parts.push(fullMatch);
      }
    } else if (hashtag) {
      // Handle hashtags
      const tag = hashtag.slice(1); // Remove the #
      parts.push(
        <Link
          key={`hashtag-${keyCounter++}`}
          to={`/t/${tag}`}
          className="text-blue-500 hover:underline"
        >
          {hashtag}
        </Link>
      );
    }

    lastIndex = index + fullMatch.length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no special content was found, just use the plain text
  if (parts.length === 0) {
    parts.push(text);
  }

  return parts;
}

// Helper component to display user mentions
function NostrMention({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const npub = nip19.npubEncode(pubkey);
  const hasRealName = !!author.data?.metadata?.name;
  const displayName = author.data?.metadata?.name ?? genUserName(pubkey);

  return (
    <Link
      to={`/${npub}`}
      className={cn(
        "font-medium hover:underline",
        hasRealName
          ? "text-blue-500"
          : "text-gray-500 hover:text-gray-700"
      )}
    >
      @{displayName}
    </Link>
  );
}