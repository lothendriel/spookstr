# Spookstr Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Settings Export & Import** - Complete backup and restore functionality for user preferences
- **Personalized Hashtags Export** - Export personalized feed preferences to JSON format
- **Hidden Users Export** - Export hidden user list for backup and transfer
- **Hidden Hashtags Export** - Export hidden hashtag preferences for content filtering
- **Settings Import with Merge** - Import settings while preserving existing items and avoiding duplicates
- **Settings Validation** - Comprehensive validation of imported data to ensure integrity
- **Refresh Button** - Added refresh button to export/import card for manual updates
- **Real-time Settings Sync** - Enhanced useLocalStorage hook with custom event system for instant updates
- **Cross-Browser Settings Transfer** - Export settings from one browser and import to another
- **Settings Summary Display** - Visual count display of current settings in each category
- **Clear All Settings** - One-click clearing of all user preferences with confirmation
- **NIP-58 Badge Support** - Added proper support for NIP-58 profile badges with fallback to demo badges when none found
- **Infinite Scroll Implementation** - Added seamless infinite scrolling across all main content areas
- **Main Feed Infinite Scroll** - Replaced manual pagination with automatic content loading as users scroll
- **Notifications Infinite Scroll** - Enhanced notifications with automatic loading, removed "Load More" button
- **Profile Page Infinite Scroll** - Added independent infinite scroll to both Posts and Replies tabs
- **useInfiniteScroll Hook** - New intersection observer-based hook for consistent infinite scroll behavior
- **InfiniteScrollLoader Component** - Reusable loading component with skeleton loaders and empty states
- **useOutboxInfiniteQuery** - Enhanced outbox query with timestamp-based pagination
- **Smart Loading Indicators** - Added skeleton loaders and ghost animations during content fetching
- **Empty State Handling** - Friendly "You've reached the end" messages when no more content available
- **Profile Relay Discovery Indicators** - Added visual feedback for relay discovery on profile pages
- **Custom Tooltip Implementation** - Created CustomTooltip component for reliable tooltip functionality
- **Relay Discovery Tooltips** - Added detailed tooltips explaining relay discovery process and effectiveness
- **Enhanced Discovery Transparency** - Users can now see when enhanced discovery is active and how many events were found

### Improved
- **Badge Management** - Refined NIP-58 badge toggle to only control badge visibility while keeping UI badges visible
- **Badge Performance** - Improved badge definition loading with parallel fetching and better error handling
- **Performance Optimization** - Content loads only when needed, reducing initial load time
- **Memory Management** - Proper cleanup and deduplication prevents memory leaks
- **User Experience** - Seamless scrolling without manual pagination buttons
- **Data Fetching** - Optimized batch interactions limited to visible posts only
- **Pagination Logic** - Timestamp-based pagination using `until` parameter for Nostr compatibility
- **Error Handling** - Improved retry logic and error states for infinite scroll
- **Responsive Design** - Infinite scroll works perfectly on all device sizes
- **Consistent UI** - All three areas now have the same smooth scrolling experience
- **Relay Discovery Consistency** - Profile pages now have the same visual discovery indicators as feed and notifications
- **User Education** - Tooltips help users understand the relay discovery process and network effectiveness

### Technical
- **Badge Fetching** - Implemented proper AbortSignal timeout management for badge queries
- **Badge Error Handling** - Added comprehensive error handling for badge fetching with fallbacks
- **Intersection Observer** - Uses `react-intersection-observer` for efficient scroll detection
- **TanStack Query Integration** - Implements `useInfiniteQuery` for robust data management
- **Nostr Best Practices** - Follows Nostr infinite scroll standards and pagination patterns
- **Deduplication Logic** - Proper duplicate prevention across infinite query pages
- **Performance Optimizations** - 1-second minimum fetch intervals to prevent rapid successive requests
- **Caching Strategy** - Enhanced caching for infinite scroll content
- **Type Safety** - Full TypeScript support for all new infinite scroll features
- **Custom Tooltip System** - Replaced Radix UI tooltips with pure CSS/React implementation
- **Z-Index Management** - Explicit z-[9999] positioning ensures tooltips appear above all elements
- **Event Handling** - Mouse enter/leave events for reliable tooltip visibility control
- **CSS Positioning** - Absolute positioning with transform centers for precise tooltip placement

### Fixed
- **Import Functionality** - Fixed issue where imported settings didn't appear in manager components
- **Settings Synchronization** - Enhanced useLocalStorage hook to listen for custom localStorageUpdate events
- **Cross-Component Updates** - Added custom event system to trigger state updates across all components
- **Real-time Settings Display** - Fixed export/import counts not updating when items are added
- **Hidden Users Validation** - Added comprehensive validation for npub and hex pubkey formats
- **Import Data Integrity** - Enhanced validation to ensure imported pubkeys are valid 64-character hex strings
- **Export Empty Data** - Fixed export functionality returning empty arrays despite having settings
- **localStorage State Sync** - Resolved issue where components maintained stale state after localStorage updates
- **NIP-58 Profile Badges** - Fixed badge loading and display issues with improved error handling
- **Badge Definition Fetching** - Enhanced badge fetching with parallel processing and proper timeouts
- **Badge UI** - Optimized badge display with minimal 1px spacing for compact presentation
- **Profile Display Name** - Fixed duplicate display name issue in profile headers
- **Missing Import** - Added missing `useMemo` import in Profile page
- **Reference Errors** - Fixed `useQuery` and `useMemo` undefined references
- **Pagination Issues** - Resolved problems with manual pagination in favor of infinite scroll
- **Content Duplication** - Fixed duplicate posts appearing across pagination boundaries
- **Loading States** - Improved loading indicators and error boundary handling
- **Relay Discovery Indicator Tooltips** - Fixed tooltips not appearing when hovering over discovery indicators
- **Radix UI Tooltip Issues** - Replaced problematic Radix UI tooltip system with custom CSS-based implementation
- **Z-Index Conflicts** - Resolved tooltips being hidden behind other UI elements with explicit z-[9999] positioning
- **Tooltip Visibility** - Fixed issue where users only saw question mark cursor instead of informative tooltips
- **Profile Discovery Feedback** - Added visual relay discovery indicators to profile pages for consistency with other pages
- **Cross-Page Consistency** - Ensured all pages (feed, notifications, profiles, post details) have same tooltip behavior

## [1.0.0] - 2024-10-24

### Added
- **Initial Release** - Spookstr paranormal social network on Nostr
- **Paranormal Feed** - Main feed with paranormal content filtering
- **User Profiles** - Profile pages with posts and replies
- **Notifications** - Real-time notifications for likes, reposts, zaps, and comments
- **Nostr Integration** - Full Nostr protocol support with NIP-65 relay discovery
- **Spookstr Relay** - Dedicated relay for paranormal content
- **Content Filtering** - NSFW filtering and content moderation
- **Real-time Updates** - Live interaction updates and notifications
- **Mobile Responsive** - Fully responsive design for all devices
- **Dark Theme** - Paranormal-themed dark interface
- **Markdown Support** - Rich text formatting for posts
- **Media Support** - Image and video embedding with blurhash
- **Zap Integration** - Lightning Network zaps for content creators
- **Follow System** - User following and profile discovery
- **Hashtag System** - Paranormal hashtag categorization
- **Relay Discovery** - Smart relay discovery using NIP-65

### Features
- **Paranormal Categories** - UFOs, cryptids, ghosts, supernatural content
- **Community Moderation** - User blocking and content filtering
- **Cross-platform** - Works on web, mobile, and desktop clients
- **Privacy Focused** - No tracking, user-controlled data
- **Decentralized** - Built on Nostr, no single point of failure
- **Open Source** - Fully open source with MIT license

### Technical
- **React 18** - Latest React with concurrent features
- **TypeScript** - Full type safety throughout the application
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI components
- **TanStack Query** - Data fetching and caching
- **Nostrify** - Nostr protocol implementation
- **Lucide React** - Icon library
- **React Router** - Client-side routing
- **Zustand** - State management

### Known Issues
- None at initial release

### Future Plans
- **Mobile Apps** - Native iOS and Android applications
- **Advanced Features** - Groups, communities, advanced filtering
- **Performance** - Further optimizations and caching improvements
- **Internationalization** - Multiple language support
- **Accessibility** - Enhanced accessibility features
- **Analytics** - Privacy-preserving analytics and insights

---

## Changelog Format

This changelog follows the format suggested by [Keep a Changelog](https://keepachangelog.com/en/1.0.0/):

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerability fixes

## Versioning

Spookstr uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for versioning. For the versions available, see the [tags on this repository](https://github.com/your-username/spookstr/tags).