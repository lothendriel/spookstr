import { useMemo } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { parseMediaFromContent } from '@/lib/mediaParser';
import { MediaDisplay } from '@/components/MediaDisplay';
import { QuotedEvent } from '@/components/QuotedEvent';

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

    // Create a Set of URLs that are being handled as media
    const skipUrls = new Set(mediaItems.map(item => item.url));

    // Remove media URLs from the text completely and create ordered parts
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

      if (mediaIndex >= 0) {
        // Add text before the media URL (if any)
        if (mediaIndex > 0) {
          const beforeText = processedText.substring(0, mediaIndex);
          parts.push(...processTextContent(beforeText, keyCounter, skipUrls));
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
      }
    });

    // Add any remaining text
    if (processedText.trim()) {
      parts.push(...processTextContent(processedText, keyCounter, skipUrls));
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
function processTextContent(text: string, keyOffset = 0, skipUrls: Set<string> = new Set()): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // Regex to find URLs, Nostr references, @mentions, and hashtags
  const regex = /(https?:\/\/[^\s]+)|(nostr:(npub1|note1|nprofile1|nevent1|naddr1)[023456789acdefghjklmnpqrstuvwxyz]+)|@([0-9a-fA-F]{8,})|(#\w+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = keyOffset;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const url = match[1];
    const nostrRef = match[2];
    const atMention = match[4]; // Group 4 is the @hex mention
    const hashtag = match[5]; // Group 5 is the hashtag
    const index = match.index;

    // Add text before this match
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }

    if (url) {
      // Normalize URL for comparison (add https:// if missing)
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

      // Skip URLs that are already handled as media - don't render them at all
      if (skipUrls.has(normalizedUrl)) {
        // Don't add anything for media URLs - they're completely hidden from text
      } else {
        // Handle URLs that aren't media
        parts.push(
          <a
            key={`url-${keyCounter++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {url}
          </a>
        );
      }
    } else if (nostrRef) {
      // Handle Nostr references
      try {
        // Remove the "nostr:" prefix
        const nostrId = nostrRef.substring(6);
        const decoded = nip19.decode(nostrId);

        if (decoded.type === 'npub') {
          const pubkey = decoded.data;
          parts.push(
            <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
          );
        } else {
          // For note, nevent, naddr types, render as quoted event
          parts.push(
            <QuotedEvent
              key={`quoted-${keyCounter++}`}
              eventId={nostrId}
              className="mt-2 mb-2"
            />
          );
        }
      } catch {
        // If decoding fails, just render as text
        parts.push(fullMatch);
      }
    } else if (atMention) {
      // Handle @hex mentions (potential pubkeys)
      try {
        // Try to decode as a hex pubkey (64 chars) or npub
        let pubkey = atMention;

        // If it's a short hex, we can't directly use it as a pubkey
        // For now, we'll show it as text but make it look like a mention
        // In a real implementation, you might want to look up users by short hex
        parts.push(
          <span
            key={`atmention-${keyCounter++}`}
            className="text-blue-500 font-medium"
          >
            @{atMention}
          </span>
        );
      } catch {
        // If anything fails, just render as text
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
        "font-medium hover:underline cursor-pointer",
        hasRealName
          ? "text-blue-600 hover:text-blue-700"
          : "text-gray-600 hover:text-gray-800"
      )}
      onClick={(e) => {
        // Ensure the link is clickable
        e.stopPropagation();
      }}
    >
      @{displayName}
    </Link>
  );
}