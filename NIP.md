# Spookstr Community Implementation

This document describes how Spookstr implements Nostr community features in full compliance with established NIPs.

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