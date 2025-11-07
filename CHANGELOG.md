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
