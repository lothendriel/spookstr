# Community Moderation System

This document describes the community moderation system implemented in Spookstr, following the NIP-72 (Moderated Communities) standard.

## Overview

The moderation system allows community owners and moderators to approve or deny posts and replies before they become visible to community members. This helps safeguard against spam and maintain community quality.

## NIP-72 Standard

Spookstr follows the [NIP-72](https://github.com/nostr-protocol/nips/blob/master/72.md) standard for moderated communities. Key aspects include:

### Event Kinds

- **Kind 34550**: Community definition (replaceable event)
- **Kind 1111**: Community posts and replies (following NIP-22)
- **Kind 4550**: Approval events issued by moderators
- **Kind 1**: Legacy community posts (for backwards compatibility)

### Post Format (Kind 1111)

Community posts use uppercase and lowercase tags to distinguish between community references and parent post references:

#### Top-level Posts

```json
{
  "kind": 1111,
  "content": "Post content...",
  "tags": [
    ["A", "34550:<community-author-pubkey>:<community-id>"],
    ["a", "34550:<community-author-pubkey>:<community-id>"],
    ["P", "<community-author-pubkey>"],
    ["p", "<community-author-pubkey>"],
    ["K", "34550"],
    ["k", "34550"]
  ]
}
```

#### Nested Replies

```json
{
  "kind": 1111,
  "content": "Reply content...",
  "tags": [
    ["A", "34550:<community-author-pubkey>:<community-id>"],
    ["P", "<community-author-pubkey>"],
    ["K", "34550"],
    ["e", "<parent-event-id>", "", "reply"],
    ["p", "<parent-event-author>"],
    ["k", "<parent-event-kind>"]
  ]
}
```

### Approval Events (Kind 4550)

When a moderator approves a post, they publish a kind 4550 event:

```json
{
  "kind": 4550,
  "content": "<JSON-stringified approved event>",
  "tags": [
    ["a", "34550:<community-author>:<community-id>"],
    ["e", "<approved-post-id>"],
    ["p", "<post-author-pubkey>"],
    ["k", "<post-kind>"]
  ]
}
```

## Features

### 1. Moderation Panel

The moderation panel is accessible to community owners and moderators through the "Manage" option in the community management interface. It provides two tabs:

#### Pending Tab
- Shows all posts and replies that haven't been approved yet
- Displays author information, post content, and timestamps
- Provides "Approve" and "Deny" buttons for each post
- Auto-refreshes every 30 seconds to show new pending content

#### Approved Tab
- Shows all posts and replies that have been approved
- Displays the same information as pending posts
- Provides a historical view of moderation activity

### 2. Approval Actions

#### Approve
When a moderator clicks "Approve":
1. A confirmation dialog appears
2. Upon confirmation, a kind 4550 approval event is published
3. The post becomes visible to all community members
4. The post moves from the "Pending" tab to the "Approved" tab
5. A success notification is shown

#### Deny
When a moderator clicks "Deny":
1. A confirmation dialog appears
2. Upon confirmation, no approval event is published
3. The post remains hidden from the community
4. The post stays in the "Pending" tab
5. A notification confirms the denial

### 3. Real-time Updates

The moderation panel uses React Query with automatic refetching:
- Polls for new pending posts every 30 seconds
- Polls for newly approved posts every 30 seconds
- Manually refetches after each moderation action
- Ensures moderators see the latest content without manual refresh

### 4. Permissions

- **Community Owner**: Can approve/deny all posts and manage moderators
- **Moderators**: Can approve/deny all posts but cannot manage other moderators
- **Regular Users**: Cannot access the moderation panel

## Implementation Details

### Components

#### `ModerationPanel` (`/src/components/ModerationPanel.tsx`)
- Main moderation interface with tabbed layout
- Handles approval/denial actions
- Displays pending and approved posts
- Includes confirmation dialogs for all actions
- Shows loading skeletons during data fetching

#### `CommunityManagement` (`/src/components/CommunityManagement.tsx`)
- Integrated moderation panel into existing management interface
- Added "Moderation" tab alongside "Settings" tab
- Maintains existing community settings functionality

### Hooks

#### `usePendingPosts` (`/src/hooks/useCommunityModeration.ts`)
- Fetches all kind 1111 posts for a community
- Fetches all kind 4550 approval events
- Filters out already approved posts
- Returns pending posts sorted by newest first
- Identifies replies by checking for 'e' tags

#### `useApprovedPosts` (`/src/hooks/useCommunityModeration.ts`)
- Fetches all kind 4550 approval events for a community
- Fetches the actual approved posts by event ID
- Returns approved posts sorted by newest first
- Provides historical view of approved content

#### `useCommunityPosts` (`/src/hooks/useCommunity.ts`)
- Updated to query both kind 1111 (new) and kind 1 (legacy) posts
- Filters by uppercase 'A' tag for kind 1111
- Filters by lowercase 'a' tag for kind 1
- Removes duplicates and sorts by timestamp

#### `useCommunityComments` (`/src/hooks/useCommunity.ts`)
- Updated to query both kind 1111 and kind 1 replies
- Filters by 'e' tag pointing to parent event
- Removes duplicates and sorts by oldest first

#### `usePostComment` (`/src/hooks/usePostComment.ts`)
- Auto-detects community posts by checking for 'A' tag with 34550
- Uses kind 1111 for community replies
- Uses kind 1 for regular replies
- Adds proper NIP-72 tags for community replies
- Maintains NIP-10 threading tags

## User Experience

### For Moderators

1. **Access Moderation Panel**
   - Navigate to community management
   - Click "Manage" button (visible only to moderators)
   - Switch to "Moderation" tab

2. **Review Pending Posts**
   - View all unmoderated content in one place
   - See author information and post content
   - Identify replies vs. top-level posts
   - Check timestamps to prioritize recent content

3. **Take Action**
   - Click "Approve" to make post visible
   - Click "Deny" to keep post hidden
   - Confirm action in dialog
   - See immediate feedback via notifications

4. **Monitor Approved Content**
   - Switch to "Approved" tab
   - Review moderation history
   - Verify approved content

### For Community Members

- Only see approved posts and replies
- Cannot see pending or denied content
- Experience a spam-free, moderated environment
- No changes to posting workflow (posts automatically enter moderation queue)

## Best Practices

### For Community Owners

1. **Assign Multiple Moderators**
   - Distribute moderation workload
   - Ensure coverage across time zones
   - Provide redundancy in case a moderator is unavailable

2. **Establish Clear Guidelines**
   - Define what content is acceptable
   - Communicate rules to community members
   - Apply moderation consistently

3. **Regular Monitoring**
   - Check pending queue frequently
   - Respond to posts within reasonable timeframes
   - Avoid letting the queue grow too large

### For Moderators

1. **Review Context**
   - Read full post content before deciding
   - Consider author reputation
   - Check for spam patterns

2. **Be Consistent**
   - Apply community guidelines fairly
   - Document moderation decisions
   - Communicate with other moderators

3. **Act Promptly**
   - Approve legitimate posts quickly
   - Deny spam immediately
   - Keep the pending queue manageable

## Technical Considerations

### Backwards Compatibility

The system supports both:
- **Kind 1111 posts** (new, proper NIP-72 format)
- **Kind 1 posts** (legacy format for older clients)

All new posts use kind 1111, but queries include kind 1 to display legacy content.

### Performance

- Uses efficient relay-level filtering with tag queries
- Implements client-side deduplication
- Auto-refreshes at reasonable intervals (30 seconds)
- Batches queries for posts and approvals

### Security

- Approval events are signed by moderators
- Community definition includes moderator list
- Only moderators can publish kind 4550 events
- Posts are filtered based on moderator approvals

## Future Enhancements

Potential improvements to the moderation system:

1. **Bulk Actions**
   - Approve/deny multiple posts at once
   - Filter by author or content type
   - Search and filter functionality

2. **Moderation History**
   - Track who approved/denied each post
   - Show moderation timestamps
   - Provide audit logs

3. **Auto-Moderation**
   - Automatically approve trusted authors
   - Flag suspicious patterns
   - Implement content filters

4. **Notifications**
   - Alert moderators of new pending posts
   - Notify authors of approval/denial
   - Real-time moderation updates

5. **Appeal System**
   - Allow authors to request review
   - Add appeal comments
   - Track appeal status

## Troubleshooting

### Posts Not Appearing

**Issue**: Approved posts don't show up in the community feed

**Solutions**:
- Check if approval event was successfully published
- Verify moderator has permission to approve
- Ensure relay is accepting kind 4550 events
- Refresh the page to force a re-query

### Moderation Panel Empty

**Issue**: No posts appear in the pending queue

**Solutions**:
- Verify posts are being published with kind 1111
- Check if posts have the correct 'A' tag
- Ensure relay is propagating community posts
- Confirm community ID and author match

### Permission Denied

**Issue**: User cannot access moderation panel

**Solutions**:
- Verify user is listed as a moderator in community definition
- Check if user is the community owner
- Ensure user is logged in with correct account
- Refresh community data to get latest moderator list

## Related Documentation

- [NIP-72: Moderated Communities](https://github.com/nostr-protocol/nips/blob/master/72.md)
- [NIP-22: Comment](https://github.com/nostr-protocol/nips/blob/master/22.md)
- [NIP-10: Text Notes and Threads](https://github.com/nostr-protocol/nips/blob/master/10.md)
- [Community Management Documentation](./COMMUNITY_MANAGEMENT.md) (if exists)
