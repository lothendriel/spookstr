# Inbox/Outbox Model Implementation Guide

## Overview

The inbox/outbox model (NIP-65) is a relay selection strategy that improves content discovery and reduces relay load by using authors' relay preferences.

## Core Concepts

### Outbox (Write Relays)
When **fetching events FROM a user**, query that user's **write relays** (where they publish their content).

### Inbox (Read Relays)
When **fetching events ABOUT a user** (mentions, tags), query that user's **read relays** (where they check for notifications).

## Implementation Recommendations for Spookstr

### 1. Query Strategy by Content Type

**Profile Metadata & User Content (kinds 0, 1, 30023, etc.)**
- When fetching a specific user's posts/profile, query their **write relays** from their kind 10002
- Fallback to default relays if no kind 10002 found

**Mentions & Notifications (events with #p tags)**
- When fetching mentions of a user, query their **read relays** from their kind 10002
- This is where users expect to receive notifications

**Social Interactions (kinds 6, 7, 9735 with #e tags)**
- Query the **original event author's write relays** to find interactions with their content
- Also query community relays for broader discovery

### 2. Publishing Strategy

When publishing events with tagged users:
1. Send to the author's **write relays**
2. Send to each tagged user's **read relays** (so they see the notification)
3. Optionally broadcast the author's kind 10002 event to increase discoverability

### 3. Fallback Strategy

Always maintain fallback behavior:
- If no kind 10002 found for a user, use app defaults
- Keep Spookstr relay in the mix for community content
- Use 2-4 preset relays for broader discovery

### 4. Caching Strategy

Cache kind 10002 events:
- Store in TanStack Query with 5-10 minute stale time
- Refresh when user explicitly changes relay settings
- Background refresh on app startup

## Benefits

1. **Better Discovery**: Find content where authors actually publish
2. **Reduced Load**: Don't query relays that won't have the content
3. **Notification Delivery**: Tagged users receive notifications on their preferred relays
4. **Interoperability**: Works with other Nostr clients following NIP-65

## Tradeoffs for Spookstr

**Considerations:**
- Spookstr is a niche community app focused on paranormal content
- Most content should flow through the Spookstr relay for community cohesion
- Implementing full inbox/outbox might reduce community visibility

**Recommended Approach:**
- Use inbox/outbox for **profile views** and **direct interactions**
- Keep current approach for **main feed** (Spookstr relay + configured relays)
- Add inbox/outbox for **notifications** and **mentions**

## Implementation Status

### ✅ Completed

1. **Outbox Model for Profiles**: `useOutboxQuery` hook fetches content from user's write relays
   - Profile pages now query the viewed user's write relays
   - Falls back to Spookstr relay + configured relays
   - Maintains community cohesion while improving discovery

2. **Inbox Model for Notifications**: `useNotifications` hook queries user's read relays
   - Notifications now query the logged-in user's read relays (their "inbox")
   - Uses NIP-65 relay list if available
   - Falls back to configured relays

3. **Inbox Model for Publishing**: `useInboxPublish` hook sends to tagged users' inboxes
   - Publishes to author's write relays
   - Publishes to tagged users' read relays (ensures notification delivery)
   - Includes Spookstr relay for community visibility

### 📋 Implementation Details

**Files Changed:**
- `src/hooks/useOutboxQuery.ts` - New hook for outbox queries
- `src/hooks/useInboxPublish.ts` - New hook for inbox-aware publishing
- `src/hooks/useNotifications.ts` - Updated to use inbox model
- `src/pages/Profile.tsx` - Updated to use outbox query
- `src/pages/RelaySettings.tsx` - Added inbox/outbox info

**Backward Compatibility:**
- ✅ All changes are additive - no breaking changes
- ✅ Falls back to existing relay configuration if NIP-65 not available
- ✅ Maintains Spookstr relay as primary for community content
- ✅ Existing hooks and components continue to work unchanged

## Code Example

```typescript
// Fetch a specific user's posts using their write relays
async function fetchUserPosts(pubkey: string) {
  // 1. Fetch user's kind 10002
  const relayList = await useUserRelays(pubkey);

  // 2. Extract write relays
  const writeRelays = relayList?.filter(r =>
    r.mode === 'write' || r.mode === 'both'
  ).map(r => r.url) || [];

  // 3. Query from those relays (with fallback)
  const relays = writeRelays.length > 0
    ? writeRelays
    : [SPOOKSTR_RELAY, ...DEFAULT_RELAYS];

  return await nostr.group(relays).query([
    { kinds: [1], authors: [pubkey], limit: 20 }
  ]);
}

// Publish with inbox model
async function publishWithInbox(event: NostrEvent) {
  // 1. Get all tagged pubkeys
  const taggedPubkeys = event.tags
    .filter(([name]) => name === 'p')
    .map(([, pubkey]) => pubkey);

  // 2. Fetch their read relays
  const inboxRelays = new Set<string>();
  for (const pubkey of taggedPubkeys) {
    const relayList = await useUserRelays(pubkey);
    const readRelays = relayList?.filter(r =>
      r.mode === 'read' || r.mode === 'both'
    ) || [];
    readRelays.forEach(r => inboxRelays.add(r.url));
  }

  // 3. Combine with author's write relays
  const allRelays = [
    ...config.relays.filter(r => r.mode === 'write' || r.mode === 'both').map(r => r.url),
    ...inboxRelays
  ];

  // 4. Publish to all
  return await nostr.group(allRelays).event(event);
}
```

## References

- [NIP-65: Relay List Metadata](https://github.com/nostr-protocol/nips/blob/master/65.md)
- [NIP-17: Private Direct Messages](https://github.com/nostr-protocol/nips/blob/master/17.md) (uses kind 10050 for DM inbox)
