import { useMemo } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { parseMediaFromContent, parseMediaFromEvent } from '@/lib/mediaParser';
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

    // First, extract media items - use event-aware parser for special handling
    const mediaItems = parseMediaFromEvent(event);

    // If no media found, use the original logic
    if (mediaItems.length === 0) {
      return processTextContent(text);
    }

    // Create a Set of URLs that are being handled as media
    const skipUrls = new Set(mediaItems.map(item => item.url));

    // Add special handling for blossom.primal.net URLs
    const blossomFileIds = new Set();
    mediaItems.forEach(item => {
      if (item.url.includes('blossom.primal.net')) {
        // Extract the file ID from URL
        const urlParts = item.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const fileId = filename.split('.')[0];
        if (fileId) {
          blossomFileIds.add(fileId);
        }
      }
    });

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

    // Normalize URLs for better matching
    const normalizedMediaItems = mediaItems.map(item => ({
      ...item,
      normalizedUrl: item.url.startsWith('http') ? item.url : `https://${item.url}`,
      urlWithoutQuery: item.url.split('?')[0],
      baseUrl: item.url.split('?')[0].toLowerCase(),
    }));

    // Process each media item and the text around it
    sortedMedia.forEach((media) => {
      // Special handling for blossom.primal.net URLs
      if (media.url.includes('blossom.primal.net') && blossomFileIds.size > 0) {
        // Try to find any URL containing the same file ID
        const urlParts = media.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const fileId = filename.split('.')[0];

        if (fileId && blossomFileIds.has(fileId)) {
          // Look for any line containing this file ID
          const lines = processedText.split('\n');
          for (const line of lines) {
            if (line.includes(fileId)) {
              const mediaIndex = processedText.indexOf(line);
              if (mediaIndex >= 0) {
                // Add text before the media URL (if any)
                if (mediaIndex > 0) {
                  const beforeText = processedText.substring(0, mediaIndex);
                  parts.push(...processTextContent(beforeText, keyCounter, skipUrls));
                  keyCounter += beforeText.split(/\s+/).length;
                }

                // Add the media display component
                parts.push(
                  <MediaDisplay
                    key={`media-${keyCounter++}`}
                    media={media}
                  />
                );

                // Remove the processed line from the text
                processedText = processedText.substring(mediaIndex + line.length);
                return; // Exit the current iteration
              }
            }
          }
        }
      }

      // Find the media URL in the current processed text
      // We need to search for the exact URL as it appears in the text
      let mediaIndex = -1;
      let foundUrl = media.url;

      // Strategy 1: Try to find the exact original URL first
      if (processedText.includes(media.url)) {
        mediaIndex = processedText.indexOf(media.url);
        foundUrl = media.url;
        console.log('🔍 Found exact URL match:', media.url);
      } else {
        // Strategy 2: Try to find the URL with different protocol (http vs https)
        const alternateProtocol = media.url.startsWith('https://')
          ? media.url.replace('https://', 'http://')
          : media.url.replace('http://', 'https://');

        if (processedText.includes(alternateProtocol)) {
          mediaIndex = processedText.indexOf(alternateProtocol);
          foundUrl = alternateProtocol;
          console.log('🔍 Found alternate protocol match:', alternateProtocol);
        } else {
          // Strategy 3: Try to find URL without www prefix
          const withoutWww = media.url.replace('www.', '');
          if (processedText.includes(withoutWww)) {
            mediaIndex = processedText.indexOf(withoutWww);
            foundUrl = withoutWww;
            console.log('🔍 Found without www match:', withoutWww);
          } else {
            // Strategy 4: Try to find URL without query parameters (as fallback)
            const urlWithoutQuery = media.url.split('?')[0];
            if (processedText.includes(urlWithoutQuery)) {
              mediaIndex = processedText.indexOf(urlWithoutQuery);
              foundUrl = urlWithoutQuery;
              console.log('🔍 Found without query params:', urlWithoutQuery);
            } else {
              // Strategy 5: Try finding filename-based match for blossom or other similar CDN links
              const filenameParts = media.url.split('/');
              const filename = filenameParts[filenameParts.length - 1];

              if (filename && processedText.includes(filename)) {
                // Look for any URL containing this filename
                const lines = processedText.split('\n');
                for (const line of lines) {
                  if (line.includes(filename)) {
                    // Extract the full URL from the line
                    const urlMatch = line.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                      mediaIndex = processedText.indexOf(line);
                      foundUrl = urlMatch[0];
                      console.log('🔍 Found filename-based match:', foundUrl);
                      break;
                    }
                  }
                }
              }

              // Strategy 6: Try matching any URL with the same file hash/ID
              if (mediaIndex < 0) {
                // Extract file hash/ID from URL (common in CDN URLs)
                const fileIdMatch = media.url.match(/\/([a-f0-9]{32,})\./i);
                if (fileIdMatch && fileIdMatch[1]) {
                  const fileId = fileIdMatch[1];
                  if (processedText.includes(fileId)) {
                    // Find a line containing this file ID
                    const lines = processedText.split('\n');
                    for (const line of lines) {
                      if (line.includes(fileId)) {
                        // Extract the full URL from the line
                        const urlMatch = line.match(/https?:\/\/[^\s]+/);
                        if (urlMatch) {
                          mediaIndex = processedText.indexOf(line);
                          foundUrl = urlMatch[0];
                          console.log('🔍 Found file ID-based match:', foundUrl);
                          break;
                        }
                      }
                    }
                  }
                }
              }

              // Strategy 7: As a fallback, try to find just the Instagram ID in the URL
              if (mediaIndex < 0) {
                const instagramIdMatch = media.url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
                if (instagramIdMatch) {
                  const instagramId = instagramIdMatch[1];
                  const possibleUrls = [
                    `/p/${instagramId}`,
                    `/reel/${instagramId}`,
                    `instagram.com/p/${instagramId}`,
                    `instagram.com/reel/${instagramId}`,
                    `www.instagram.com/p/${instagramId}`,
                    `www.instagram.com/reel/${instagramId}`,
                  ];

                  for (const possibleUrl of possibleUrls) {
                    if (processedText.includes(possibleUrl)) {
                      mediaIndex = processedText.indexOf(possibleUrl);
                      foundUrl = possibleUrl;
                      console.log('🔍 Found Instagram ID fallback match:', foundUrl);
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Final fallback: If we still haven't found it, try to find any URL in the text
      if (mediaIndex < 0) {
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urlMatch = urlRegex.exec(processedText);
        if (urlMatch) {
          // Check if this URL contains the same domain or filename as our media URL
          const candidateUrl = urlMatch[0];
          const mediaDomain = new URL(media.url).hostname;
          const candidateDomain = new URL(candidateUrl).hostname;

          if (mediaDomain === candidateDomain || candidateUrl.includes(media.url.split('/').pop() || '')) {
            mediaIndex = urlMatch.index;
            foundUrl = candidateUrl;
            console.log('🔍 Found domain/filename fallback match:', foundUrl);
          }
        }
      }

      if (mediaIndex >= 0) {
        console.log('✅ Successfully found media URL in text:', {
          mediaType: media.type,
          foundUrl,
          mediaIndex,
          fullMediaUrl: media.url
        });

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
        // We need to ensure we remove the COMPLETE URL including all query parameters
        let endIndex = mediaIndex + foundUrl.length;

        // Check if we need to extend the removal to capture the full URL with query parameters
        if (processedText.length > endIndex) {
          // Look for the actual URL in the text that might be longer than what we matched
          const remainingText = processedText.substring(mediaIndex);

          // Find the complete URL by looking for the next space or end of string
          // This ensures we capture the full URL including all query parameters
          const urlEndInRemaining = remainingText.indexOf(' ');
          const actualUrlLength = urlEndInRemaining === -1 ? remainingText.length : urlEndInRemaining;

          // Use the actual URL length from the text
          endIndex = mediaIndex + actualUrlLength;

          // Log for debugging
          console.log('🔗 URL removal debug:', {
            foundUrl,
            actualUrlInText: remainingText.substring(0, actualUrlLength),
            mediaIndex,
            endIndex,
            remainingTextPreview: remainingText.substring(0, 100)
          });
        }

        // Final check: ensure we're not leaving behind URL fragments
        const removedText = processedText.substring(mediaIndex, endIndex);
        const remainingAfterRemoval = processedText.substring(endIndex);

        // Check if what remains starts with URL-like fragments (like &ct=g)
        const urlFragmentRegex = /^[&?][^s]+/;
        if (urlFragmentRegex.test(remainingAfterRemoval.trim())) {
          console.warn('🚨 Detected URL fragment after removal:', {
            removedText,
            remainingFragment: remainingAfterRemoval.trim(),
            extendingRemoval: true
          });

          // Extend removal to include the fragment
          const fragmentEnd = remainingAfterRemoval.indexOf(' ');
          if (fragmentEnd === -1) {
            endIndex = processedText.length; // Remove to end
          } else {
            endIndex += fragmentEnd; // Remove to next space
          }
        }

        processedText = processedText.substring(endIndex);

        console.log('✅ Final URL removal result:', {
          removedLength: endIndex - mediaIndex,
          remainingTextPreview: processedText.substring(0, 50)
        });
      } else {
        console.warn('❌ Could not find media URL in text for removal:', media.url);
        console.warn('🔍 Current processed text preview:', processedText.substring(0, 200));
        console.warn('🔍 Full processed text length:', processedText.length);

        // For debugging - log media and event details
        console.debug('📎 Media item that failed to match:', {
          type: media.type,
          url: media.url,
          filename: media.url.split('/').pop(),
          domain: new URL(media.url).hostname
        });

        // Try to find any URLs in the text for comparison
        const textUrls = processedText.match(/https?:\/\/[^\s]+/g);
        if (textUrls) {
          console.warn('🔗 URLs found in text:', textUrls);
        }

        // Log the full event for debugging
        if (event.tags.some(tag => tag[0] === 'imeta')) {
          console.debug('📋 Event with imeta tags had URL matching issues:', {
            id: event.id.substring(0, 8) + '...',
            imetaTags: event.tags.filter(tag => tag[0] === 'imeta'),
            contentExcerpt: event.content.substring(0, 100) + '...',
          });
        }
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
        console.log('🔍 NoteContent: Found nostr reference:', nostrId);
        const decoded = nip19.decode(nostrId);

        if (decoded.type === 'npub') {
          const pubkey = decoded.data;
          parts.push(
            <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
          );
        } else if (decoded.type === 'nprofile') {
          const profileData = decoded.data as { pubkey: string; relays?: string[] };
          parts.push(
            <NostrMention key={`mention-${keyCounter++}`} pubkey={profileData.pubkey} />
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
      } catch (error) {
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