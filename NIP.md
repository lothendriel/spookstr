# Spookstr Implementation

This document describes how Spookstr implements Nostr features in full compliance with established NIPs and custom event kinds for paranormal-specific functionality.

## Custom Event Kinds

Spookstr defines the following custom event kinds:

| Kind  | Type        | Description                           | NIP Reference |
|-------|-------------|---------------------------------------|---------------|
| 32921 | Addressable | Paranormal Location Pins (Ghost Map)  | This document |
| 4551  | Regular     | Community Post Denial (Moderation)    | This document |

## Standard NIP Compliance

Spookstr implements the following standard NIPs:

- **NIP-22**: Comments (Kind 1111 for community posts and replies)
- **NIP-72**: Moderated Communities (Kinds 34550, 4550)
- **NIP-92**: Media Attachments (imeta tags)
- **NIP-94**: File Metadata (media uploads)

## Kind 32921: Paranormal Location Pins

Spookstr implements **Kind 32921** for storing and sharing paranormal encounter location data. This custom addressable event kind enables the Ghost Hunt Maps feature where users can pin and discover paranormal activity locations.

### Location Event Structure

```json
{
  "kind": 32921,
  "content": "<detailed-description-of-encounter>",
  "tags": [
    ["d", "<unique-location-identifier>"],
    ["title", "<title-of-encounter>"],
    ["g", "<geohash>"],
    ["lat", "<latitude>"],
    ["lon", "<longitude>"],
    ["t", "paranormal"],
    ["t", "<category>"],
    ["published_at", "<unix-timestamp>"],
    ["alt", "Paranormal location pin: <title>"]
  ]
}
```

### Required Tags

- **`d`**: Unique identifier for the location (e.g., "location-<timestamp>-<random>") - Required for addressable events
- **`title`**: Title of the paranormal encounter or location name
- **`g`**: Geohash for location privacy and approximate positioning (recommended: precision 6-7)
- **`lat`**: Latitude in decimal degrees (optional, for precise mapping)
- **`lon`**: Longitude in decimal degrees (optional, for precise mapping)
- **`t`**: "paranormal" - Main category tag (required)
- **`published_at`**: Unix timestamp of when the encounter occurred or was reported

### Optional Tags

- **`t`**: Category tags for filtering (e.g., "ghost", "ufo", "cryptid", "haunting", "poltergeist")
- **`image`**: URL to image evidence
- **`imeta`**: NIP-92 inline metadata for images
- **`location`**: Human-readable location name (e.g., "Waverly Hills Sanatorium, Louisville, KY")

### Content Field

The `content` field contains the detailed description of the paranormal encounter in plaintext or markdown format. This is the main narrative of what happened at this location.

### Addressable Event Benefits

Using Kind 30023 (Long-form Content) provides several advantages:

- **Relay Acceptance**: Standardized kind that all relays accept and store
- **Addressable**: Can be updated/replaced using the same `d` tag identifier
- **Interoperability**: Compatible with other long-form content clients
- **Permanent Storage**: Addressable events are stored permanently by relays

### Query Examples

```javascript
// Get all paranormal location pins
const locations = await nostr.query([{ kinds: [32921] }]);

// Get paranormal locations by category
const ghostSightings = await nostr.query([{
  kinds: [32921],
  '#t': ['ghost']
}]);

// Get locations near a specific area using geohash prefix
const nearbyLocations = await nostr.query([{
  kinds: [32921],
  '#g': ['9q8yy'] // Geohash prefix for San Francisco area
}]);

// Get specific location by address (pubkey + d tag)
const specificLocation = await nostr.query([{
  kinds: [32921],
  authors: ['<user-pubkey>'],
  '#d': ['location-1234567890']
}]);

// Get locations by author
const userLocations = await nostr.query([{
  kinds: [32921],
  authors: ['<user-pubkey>']
}]);
```

### Privacy and Safety Considerations

- **Geohash Precision**: Use geohash precision 6-7 (±610m to ±76m) for approximate locations
- **Exact Coordinates**: Only include `lat`/`lon` tags for public locations or with explicit permission
- **Private Property**: Never share exact coordinates of private residences without consent
- **Legal Compliance**: Respect local laws, trespassing regulations, and private property rights
- **Safety First**: Consider whether publishing a location might endanger others or encourage unsafe behavior

### Geohash Implementation

Geohashes provide privacy-preserving approximate locations:

```javascript
import { encode as encodeGeohash } from 'ngeohash';

// Precision levels:
// 6 characters: ±610m (recommended for general area)
// 7 characters: ±76m (recommended for public landmarks)
// 8+ characters: precise location (use only for public venues)

const geohash = encodeGeohash(latitude, longitude, 6);
```

### Example Event

```json
{
  "kind": 32921,
  "content": "Experienced full-body apparition of a woman in Victorian-era clothing in the east wing hallway around 2:30 AM. Witnessed by myself and two other investigators. Temperature dropped 15°F immediately before the sighting. EMF detector spiked to 7.2 mG. Apparition lasted approximately 45 seconds before fading. Security cameras captured anomalous light phenomena at the same timestamp.",
  "tags": [
    ["d", "location-1702345678-abc123"],
    ["title", "Victorian Woman Apparition - Waverly Hills"],
    ["g", "dng8q6"],
    ["location", "Waverly Hills Sanatorium, Louisville, KY"],
    ["t", "paranormal"],
    ["t", "ghost"],
    ["t", "apparition"],
    ["t", "haunting"],
    ["published_at", "1702345678"],
    ["alt", "Paranormal location pin: Victorian Woman Apparition - Waverly Hills"]
  ]
}
```

## NIP-72 Compliance: Moderated Communities

Spookstr implements **full NIP-72 compliance** for moderated communities using a Reddit-style moderation system.

### Community Definition (Kind 34550)

Community definitions use the standard NIP-72 structure:

```json
{
  "kind": 34550,
  "tags": [
    ["d", "<community-id>"],
    ["name", "<Community Name>"],
    ["description", "<Community Description>"],
    ["image", "<Community Image URL>"],
    ["p", "<moderator-pubkey>", "<relay-hint>", "moderator"],
    ["relay", "<relay-url>", "requests"],
    ["relay", "<relay-url>", "approvals"]
  ],
  "content": "<Community Description>"
}
```

### Community Posts (Kind 1111)

Posts to communities use **Kind 1111** (NIP-22) with proper NIP-72 community tagging:

#### Top-level Community Posts

```json
{
  "kind": 1111,
  "content": "<post-content>",
  "tags": [
    ["A", "34550:<community-author>:<community-id>"],
    ["a", "34550:<community-author>:<community-id>"],
    ["P", "<community-author>"],
    ["p", "<community-author>"],
    ["K", "34550"],
    ["k", "34550"],
    ["t", "<hashtag>"]
  ]
}
```

#### Community Post Replies (NIP-22 + NIP-72)

Replies within communities follow **NIP-22** uppercase/lowercase tag patterns:

```json
{
  "kind": 1111,
  "content": "<reply-content>",
  "tags": [
    // Uppercase: Root scope (community + original post)
    ["A", "34550:<community-author>:<community-id>"],
    ["E", "<root-post-id>"],
    ["P", "<community-author>"],
    ["K", "34550"],

    // Lowercase: Immediate parent (post or comment being replied to)
    ["e", "<parent-id>"],
    ["p", "<parent-author>"],
    ["k", "<parent-kind>"]
  ]
}
```

### Community Post Approval (Kind 4550)

Moderator approvals follow standard NIP-72 structure:

```json
{
  "kind": 4550,
  "content": "<json-stringified-approved-event>",
  "tags": [
    ["a", "34550:<community-author>:<community-id>"],
    ["e", "<approved-post-id>"],
    ["p", "<post-author>"],
    ["k", "<original-post-kind>"]
  ]
}
```

### Community Post Denial (Kind 4551)

Moderator denials use a custom kind for tracking denied posts:

```json
{
  "kind": 4551,
  "content": "{\"deniedEvent\":<denied-event>,\"reason\":\"<reason>\",\"timestamp\":<unix-timestamp>}",
  "tags": [
    ["a", "34550:<community-author>:<community-id>"],
    ["e", "<denied-post-id>"],
    ["p", "<post-author>"],
    ["k", "<original-post-kind>"]
  ]
}
```

## Content Filtering and Moderation

### Approved Content Display

- **Regular Users**: Only see posts that have corresponding Kind 4550 approval events
- **Moderators**: See all posts (pending and approved) in the moderation panel
- **Community Owners**: Have full moderation privileges

### NSFW Content Filtering

All community content is filtered through the NSFW content filter to maintain appropriate community standards.

## Implementation Features

### Core Components

1. **CreateCommunityPost**: NIP-72 compliant post creation with proper community tagging
2. **CommunityCommentForm**: NIP-22 + NIP-72 compliant reply system
3. **ModerationPanel**: Full moderator interface for post approval/denial
4. **CommunityFeed**: Displays only approved posts to regular users

### Moderation Features

- **Real-time Moderation**: Pending posts appear immediately for moderators
- **Approval Workflow**: Simple approve/deny interface with confirmation dialogs
- **Cache Management**: Aggressive cache invalidation ensures UI updates after moderation actions
- **Multi-relay Support**: Queries multiple relays for maximum approval event discovery

## Backward Compatibility

The implementation maintains backward compatibility by:

- Querying both Kind 1111 (new) and Kind 1 (legacy) events for community posts
- Supporting existing paranormal feed posts (Kind 1) alongside community posts (Kind 1111)
- Preserving all existing posting workflows while adding new community-specific flows

## Relay Configuration

Communities can specify preferred relays for different operations:

- **`requests`**: Where users submit posts to the community
- **`approvals`**: Where moderators publish approval events
- **`author`**: Where the community definition is hosted

Default relays:
- Requests: `wss://relay.nostr.band`
- Approvals: `wss://relay.damus.io`

## Media Attachments

All community posts and comments support media attachments via:

- **NIP-94**: File metadata events for proper file handling
- **Blossom Servers**: Decentralized file storage using `useUploadFile` hook
- **Media Types**: Images, videos, and audio files
- **Inline URLs**: File URLs are automatically inserted into post content

## Security Considerations

1. **Author Verification**: All approval events must come from authorized moderators
2. **Community Verification**: Posts must reference the correct community address
3. **Duplicate Prevention**: Event signature tracking prevents double submissions
4. **NSFW Filtering**: Automatic content filtering maintains community standards

This implementation ensures full interoperability with other NIP-72 compliant clients while providing a polished user experience for community moderation and participation.