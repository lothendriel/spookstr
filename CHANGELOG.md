# Changelog

All notable changes to Spookstr will be documented in this file.

## [Unreleased]

### Added (2025-01-XX)
- **Personalized Hashtags Feature**: Users can now add hashtags they're interested in to see more relevant content in their feed
  - New `usePersonalizedHashtags` hook for managing user-specific hashtags with local storage persistence
  - `PersonalizedHashtagsManager` component in User Settings for managing personalized hashtags
  - Feed enhancement that includes posts with user's personalized hashtags alongside regular paranormal content
  - Users can add hashtags to personalize their feed (with or without # prefix)
  - Users can remove hashtags individually or clear all at once
  - Case-insensitive hashtag matching and flexible input format
  - Backwards compatible - no behavior change for users who don't use the feature
  - Private and secure - all preferences stored in browser localStorage
- **Hashtag Filtering Feature**: Users can now hide posts containing specific hashtags
  - New `useHiddenHashtags` hook for managing hidden hashtags with local storage persistence
  - `HiddenHashtagsManager` component in User Settings for managing hidden hashtags
  - Hashtag filtering integrated across all feeds (paranormal feed, community feed, comments)
  - Users can add hashtags to hide (with or without # prefix)
  - Users can unhide hashtags individually or clear all at once
  - Case-insensitive hashtag matching
  - Follows same UX pattern as existing hidden users feature

### Technical Details
- Created `/src/hooks/usePersonalizedHashtags.ts` for managing user-specific hashtags with localStorage persistence
- Created `/src/components/PersonalizedHashtagsManager.tsx` with full UI implementation for personalized hashtag management
- Updated `/src/hooks/useParanormalFeed.ts` to include personalized hashtags in feed queries with smart query optimization
- Updated `/src/pages/UserSettings.tsx` to include personalized hashtags manager component
- Enhanced feed logic to combine paranormal tags with personalized hashtags dynamically
- Implemented backwards-compatible approach that maintains existing behavior for users who don't use the feature
- All changes are type-safe and build successfully
- Created `/src/hooks/useHiddenHashtags.ts` with hashtag management functions
- Created `/src/components/HiddenHashtagsManager.tsx` with full UI implementation
- Updated `/src/hooks/useParanormalFeed.ts` to filter by hidden hashtags
- Updated `/src/hooks/useCommunityFeed.ts` to filter by hidden hashtags
- Updated `/src/hooks/useComments.ts` to filter by hidden hashtags
- Updated `/src/pages/UserSettings.tsx` to include hashtag manager component
- All changes are type-safe and build successfully

### User Experience Improvements
- Content discovery is now more powerful with personalized hashtag recommendations alongside content filtering
- Users can now customize their feed with topics they're interested in while still filtering out unwanted content
- Settings page provides comprehensive content management with both personalized and filtering options
- Consistent UI patterns across all hashtag management features
- Real-time feed updates when hashtags are added/removed or hidden/shown
- Enhanced user engagement through personalized content discovery
- Maintains backwards compatibility - existing users see no changes until they opt into personalized features

## 2025-01-07 - Fixed Event Publishing

### Bug Fixes
- **Fixed likes, reposts, comments, and zaps not publishing**: Corrected the `useNostrPublish` hook to properly await the Promise returned by `NPool.event()` instead of treating it as an array of relay URLs
- **Resolved "relayUrls is not iterable" error**: The issue was a misunderstanding of the NPool API - `nostr.event()` returns a Promise in this version of Nostrify, not a synchronous array
- **All interactions now work correctly**: Users can now like, repost, comment, and zap posts successfully

### Technical Details
- Updated `src/hooks/useNostrPublish.ts` to use `await nostr.event(signedEvent, { signal })` instead of trying to iterate over the return value
- Simplified the publishing logic by letting NPool handle relay routing internally
- Removed unnecessary relay iteration code that was causing the failure
- Event publishing now works reliably across all interaction types (likes, reposts, comments, zaps)
