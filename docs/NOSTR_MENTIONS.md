# Nostr @ Mention System

This document describes the implementation of the @ mention system that allows users to mention other Nostr users in their posts and comments.

## Overview

The mention system provides a Twitter-like experience where users can type `@` followed by a user's name to get an autocomplete dropdown with suggestions. When a user is selected, their reference is embedded in the content using NIP-27 format, and appropriate `p` tags are added to notify them.

## Components

### MentionTextarea

A drop-in replacement for the standard `Textarea` component that adds mention functionality.

**Usage:**
```tsx
import { MentionTextarea } from '@/components/ui/mention-textarea';

<MentionTextarea
  placeholder="Type @ to mention someone..."
  value={content}
  onChange={(e) => setContent(e.target.value)}
  rows={4}
/>
```

**Features:**
- Detects `@` character followed by text
- Shows autocomplete dropdown with user suggestions
- Keyboard navigation (arrow keys, enter, escape)
- Automatic insertion of NIP-19 `nprofile` references
- Click-to-select functionality

### useUserSearch Hook

Provides user search functionality for the mention system.

**Features:**
- Searches followed users first (prioritized)
- Searches by name, NIP-05 address, and about text
- Caches results for performance
- Smart scoring algorithm for relevance

**Usage:**
```tsx
const { searchUsers, users, isLoading } = useUserSearch();

// Trigger search
searchUsers('alice');

// users contains SearchableUser[] with metadata and scores
```

## Mention Processing

### extractMentions Function

Extracts mentioned users from content and returns `p` tags for the event.

```tsx
import { extractMentions } from '@/lib/mentions';

const content = "Hello nostr:nprofile1abc123... how are you?";
const pTags = extractMentions(content);
// Returns: [['p', 'pubkey-hex']]
```

### formatMentionsForDisplay Function

Converts `nostr:` mentions back to readable `@username` format for display.

```tsx
const displayContent = formatMentionsForDisplay(content, getUserDisplayName);
// "Hello @alice how are you?"
```

## Implementation Details

### NIP Compliance

The system follows these Nostr NIPs:

- **NIP-27**: Text Note References - for embedding mentions as `nostr:nprofile1...`
- **NIP-19**: bech32-encoded entities - for encoding user references
- **NIP-05**: DNS-based identifiers - for user discovery via human-readable names
- **NIP-10**: For threading and reply contexts

### Event Structure

When a post contains mentions, the event includes:

```json
{
  "kind": 1,
  "content": "Hello nostr:nprofile1qqsw3dy8cpu...6x2argwghx6egsqstvg!",
  "tags": [
    ["p", "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"],
    ["t", "some-hashtag"]
  ]
}
```

### User Discovery

The system discovers users through:

1. **Follow List (Kind 3)**: Users you follow are prioritized
2. **Profile Metadata (Kind 0)**: Searches name, NIP-05, about text
3. **Relay Search**: Uses relay search capabilities when available

### Search Algorithm

Users are ranked by:

1. **Following Status**: Followed users appear first
2. **Match Score**: Based on text matching in name, NIP-05, about
3. **Relevance**: Exact matches score higher than partial matches

## Usage in Forms

The mention system is integrated into all posting components:

- **CreateParanormalPost**: Main posting form
- **CommentForm**: Comment and reply forms
- **CommunityManagement**: Community description
- **CreateCommunityDefinition**: Community creation

## Testing

A test component is available for debugging:

```tsx
import { MentionTest } from '@/components/__test__/MentionTest';
```

This shows:
- Real-time mention extraction
- Generated p tags
- Raw content with nostr: references

## Security Considerations

- All NIP-19 decoding includes error handling
- Invalid mentions are ignored silently
- No private key exposure (uses signer interface)
- Prevents duplicate p tags for the same user

## Performance

- User search results are cached for 30 seconds
- Follow list is cached for 5 minutes
- Debounced search queries to prevent spam
- Limits to 10 search results maximum

## Browser Compatibility

- Uses modern JavaScript features (optional chaining, nullish coalescing)
- Requires support for AbortController and AbortSignal
- Works with all modern browsers (Chrome 80+, Firefox 72+, Safari 13+)

## Future Enhancements

Potential improvements:

1. **Avatar Caching**: Cache user avatars for better performance
2. **Offline Support**: Show recently mentioned users when offline
3. **Group Mentions**: Support for mentioning entire groups/communities
4. **Custom Mention Triggers**: Allow other trigger characters besides @
5. **Mention Analytics**: Track mention engagement and success rates