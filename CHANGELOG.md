# Changelog

All notable changes to Spookstr will be documented in this file.

## [Unreleased]

### Added (2025-01-XX)
- **Hashtag Filtering Feature**: Users can now hide posts containing specific hashtags
  - New `useHiddenHashtags` hook for managing hidden hashtags with local storage persistence
  - `HiddenHashtagsManager` component in User Settings for managing hidden hashtags
  - Hashtag filtering integrated across all feeds (paranormal feed, community feed, comments)
  - Users can add hashtags to hide (with or without # prefix)
  - Users can unhide hashtags individually or clear all at once
  - Case-insensitive hashtag matching
  - Follows same UX pattern as existing hidden users feature

### Technical Details
- Created `/src/hooks/useHiddenHashtags.ts` with hashtag management functions
- Created `/src/components/HiddenHashtagsManager.tsx` with full UI implementation
- Updated `/src/hooks/useParanormalFeed.ts` to filter by hidden hashtags
- Updated `/src/hooks/useCommunityFeed.ts` to filter by hidden hashtags
- Updated `/src/hooks/useComments.ts` to filter by hidden hashtags
- Updated `/src/pages/UserSettings.tsx` to include hashtag manager component
- All changes are type-safe and build successfully

### User Experience Improvements
- Content filtering is now more powerful with both user and hashtag filtering
- Settings page provides centralized content management
- Consistent UI patterns across filtering features
- Real-time feed updates when hashtags are hidden/shown

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
