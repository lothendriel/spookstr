# Spookstr Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Infinite Scroll Implementation** - Added seamless infinite scrolling across all main content areas
- **Main Feed Infinite Scroll** - Replaced manual pagination with automatic content loading as users scroll
- **Notifications Infinite Scroll** - Enhanced notifications with automatic loading, removed "Load More" button
- **Profile Page Infinite Scroll** - Added independent infinite scroll to both Posts and Replies tabs
- **useInfiniteScroll Hook** - New intersection observer-based hook for consistent infinite scroll behavior
- **InfiniteScrollLoader Component** - Reusable loading component with skeleton loaders and empty states
- **useOutboxInfiniteQuery** - Enhanced outbox query with timestamp-based pagination
- **Smart Loading Indicators** - Added skeleton loaders and ghost animations during content fetching
- **Empty State Handling** - Friendly "You've reached the end" messages when no more content available

### Improved
- **Performance Optimization** - Content loads only when needed, reducing initial load time
- **Memory Management** - Proper cleanup and deduplication prevents memory leaks
- **User Experience** - Seamless scrolling without manual pagination buttons
- **Data Fetching** - Optimized batch interactions limited to visible posts only
- **Pagination Logic** - Timestamp-based pagination using `until` parameter for Nostr compatibility
- **Error Handling** - Improved retry logic and error states for infinite scroll
- **Responsive Design** - Infinite scroll works perfectly on all device sizes
- **Consistent UI** - All three areas now have the same smooth scrolling experience

### Technical
- **Intersection Observer** - Uses `react-intersection-observer` for efficient scroll detection
- **TanStack Query Integration** - Implements `useInfiniteQuery` for robust data management
- **Nostr Best Practices** - Follows Nostr infinite scroll standards and pagination patterns
- **Deduplication Logic** - Proper duplicate prevention across infinite query pages
- **Performance Optimizations** - 1-second minimum fetch intervals to prevent rapid successive requests
- **Caching Strategy** - Enhanced caching for infinite scroll content
- **Type Safety** - Full TypeScript support for all new infinite scroll features

### Fixed
- **Missing Import** - Added missing `useMemo` import in Profile page
- **Reference Errors** - Fixed `useQuery` and `useMemo` undefined references
- **Pagination Issues** - Resolved problems with manual pagination in favor of infinite scroll
- **Content Duplication** - Fixed duplicate posts appearing across pagination boundaries
- **Loading States** - Improved loading indicators and error boundary handling

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