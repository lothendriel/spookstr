# Hybrid Relay Implementation Summary

## What Was Implemented

We've successfully implemented a **hybrid inbox/outbox model** that follows NIP-65 best practices while maintaining Spookstr's community-focused approach.

## Key Changes

### 1. New Hooks

#### `useOutboxQuery` - Smart Content Discovery
```typescript
const { data: posts } = useOutboxQuery({
  authorPubkey: pubkey,
  filters: [{ kinds: [1], authors: [pubkey], limit: 50 }],
});
```

**How it works:**
- Fetches the user's NIP-65 relay list
- Queries their **write relays** (where they publish content)
- Always includes Spookstr relay for community cohesion
- Falls back to configured relays if no NIP-65 list

**Used in:**
- Profile pages to fetch user posts and replies

#### `useInboxPublish` - Smart Notification Delivery
```typescript
const { mutate: publish } = useInboxPublish();

publish({
  kind: 1,
  content: "Hello @alice!",
  tags: [['p', alicePubkey]],
});
```

**How it works:**
- Publishes to author's write relays
- Fetches NIP-65 relay lists for all tagged users
- Publishes to their **read relays** (their "inbox")
- Ensures tagged users receive notifications
- Always includes Spookstr relay

**Used in:**
- Available for any component that needs inbox-aware publishing
- Ready to replace `useNostrPublish` where inbox model is desired

### 2. Enhanced Existing Hooks

#### `useNotifications` - Inbox Model
**Before:** Queried configured relays
**After:** Queries user's NIP-65 read relays (inbox)

**Benefits:**
- Better notification discovery
- Follows where the user expects to receive mentions
- Falls back to configured relays

### 3. Updated UI

#### Relay Settings Page
- Shows write/read relay counts from published NIP-65 list
- Explains inbox/outbox model in plain language
- Visual indicators for how relays are used
- Guides users on optimal relay configuration

## How It Works

### Outbox Model (Content Discovery)

**When viewing someone's profile:**
1. Check if they have a published NIP-65 relay list (kind 10002)
2. Extract their **write relays** (where they publish)
3. Query those relays for their content
4. Also include Spookstr relay + configured relays as fallback

**Benefits:**
- Find content where authors actually publish it
- Better discovery across the Nostr network
- Works even if the author uses different relays than you

### Inbox Model (Notifications)

**When checking notifications:**
1. Check your own NIP-65 relay list
2. Query your **read relays** (your "inbox")
3. Find mentions and interactions with your posts
4. Falls back to configured relays

**When publishing with mentions:**
1. Get all tagged users' pubkeys
2. Fetch their NIP-65 relay lists
3. Extract their **read relays** (their "inbox")
4. Publish to your write relays + their read relays
5. Always include Spookstr relay

**Benefits:**
- Tagged users receive notifications on their preferred relays
- Better notification delivery across clients
- Follows NIP-65 standard for interoperability

## Backward Compatibility

### ✅ No Breaking Changes

1. **Falls back gracefully:** If no NIP-65 list is found, uses configured relays
2. **Preserves existing behavior:** Main feed still uses configured relays
3. **Community cohesion:** Spookstr relay always included
4. **Existing hooks unchanged:** `useNostrPublish`, `useMultiRelayQuery` still work
5. **Optional adoption:** Components can choose when to use new hooks

### Migration Path

**Immediate (Done):**
- Profile pages use outbox model ✅
- Notifications use inbox model ✅

**Optional (Future):**
- Replace `useNostrPublish` with `useInboxPublish` in comment forms
- Replace `useMultiRelayQuery` with `useOutboxQuery` where appropriate
- Add outbox queries for hashtag feeds

## User Experience Improvements

### For Content Creators
- Their posts are discovered even by users on different relays
- Better reach across the Nostr network
- Notifications reach them on their preferred relays

### For Content Consumers
- See complete profiles even if users publish to different relays
- Receive notifications on their configured read relays
- Better content discovery overall

### For the Spookstr Community
- Spookstr relay remains central hub
- Community content still flows through main relay
- Enhanced discovery without fragmentation

## Technical Details

### Relay Selection Strategy

**Profile Queries (Outbox):**
1. User's write relays (from NIP-65)
2. Spookstr relay (always)
3. Configured read relays (fallback)
4. Preset relays (up to 5 total)

**Notifications (Inbox):**
1. User's read relays (from NIP-65)
2. Configured read relays (fallback)
3. Spookstr relay (if not already included)

**Publishing with Tags (Inbox):**
1. Author's write relays
2. Tagged users' read relays (from NIP-65)
3. Spookstr relay (always)
4. Preset relays (up to 8 total)

### Caching Strategy
- NIP-65 relay lists cached for 5 minutes
- Reduces redundant relay list queries
- Refreshes on app startup and settings changes

### Performance
- Max 5 relays for queries (prevents slowdown)
- Max 8 relays for publishing (ensures delivery)
- Timeout protection (10s for queries)
- Deduplication of events from multiple relays

## Testing Recommendations

1. **Test profile discovery:**
   - View profile of user who publishes to different relays
   - Verify their posts appear

2. **Test notifications:**
   - Have someone mention you on a different relay
   - Verify notification appears

3. **Test publishing:**
   - Publish a post mentioning someone
   - Verify they receive notification on their relays

4. **Test fallback:**
   - Use app without NIP-65 relay list
   - Verify everything still works with configured relays

## Future Enhancements

### Potential Additions
1. Auto-detect optimal relay list based on usage
2. Relay performance metrics in settings
3. Visual relay connection status
4. Relay recommendation system
5. Batch NIP-65 fetching for feed queries

### Monitoring
- Track relay query success rates
- Monitor notification delivery
- Measure content discovery improvements

## References

- [NIP-65: Relay List Metadata](https://github.com/nostr-protocol/nips/blob/master/65.md)
- [NIP-17: Private Direct Messages](https://github.com/nostr-protocol/nips/blob/master/17.md) (uses kind 10050 for DM inbox)
- [docs/INBOX_OUTBOX_MODEL.md](./INBOX_OUTBOX_MODEL.md) - Detailed implementation guide
