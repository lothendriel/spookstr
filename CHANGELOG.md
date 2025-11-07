# Spookstr Development Changelog

This document tracks major changes, bug fixes, and development decisions for the Spookstr project.

---

## 2025-01-06

### Media Parsing Fixes - Video Display Issues

**Issue**: Videos with `imeta` tags were displaying as "External Media" cards instead of inline video players.

**Root Cause**: 
- URLs from `imeta` tags were being parsed twice (once from imeta, once from content)
- The duplicate detection only tracked `blossom.primal.net` file IDs
- Videos from `video.nostr.build` were being rendered as external links

**Fixes Applied**:

1. **Commit d85657d** - Fix duplicate media rendering from imeta tags
   - Changed duplicate detection to track ALL URLs from imeta tags (not just blossom)
   - Modified `parseMediaFromContent` to accept `skipUrls` set instead of `blossomIds`
   - Now properly skips any URL already processed from imeta tags
   - Eliminates duplicate "External Media" cards

2. **Commit a8263d0** - Fix video rendering in imeta tags
   - Added fallback to detect media type from file extension when mime type is missing
   - Ensures .mp4, .webm, etc. are correctly identified as videos
   - Previously defaulted to 'external' type when no mime type present

**Technical Details**:
- `imeta` tags structure: `["imeta", "url <URL>", "blurhash <hash>", "dim <dimensions>"]`
- Some `imeta` tags don't include `m <mime-type>` field
- Parser now checks file extension as fallback: `.mp4` → video, `.jpg` → image, etc.
- All imeta URLs are collected into a Set and passed to content parser to prevent duplicates

**Result**: Videos now display once with full inline video player (play controls, volume, fullscreen, etc.)

---

## Previous Work (Pre-Log)

### Media Parsing System

**Commits 88d67f2 through ba9db8c** - Critical fixes for imeta tag processing
- Fixed issue where images from imeta tags weren't being returned
- Resolved blossom.primal.net image parsing issues
- Improved handling of duplicate URLs from both imeta and content

**Commit 27ac455** - Context-aware audio detection
- Added intelligent detection for audio content based on hashtags (#songstr, #music, etc.)
- Converts .mp4 files to audio players when audio context is detected
- Prevents music/podcast files from displaying as video players

**Commits d5e5686 & c1d5d44** - Audio player improvements
- Enhanced MIME type handling for various audio formats
- Improved UI for audio playback
- Fixed detection for Yakbak audio notes (kind 1222)

**Commits fe0993e & e069ea4** - Instagram embed fixes
- Replaced API-based Instagram embed with beautiful preview card
- No longer requires Instagram API credentials
- Better fallback handling when Instagram content unavailable

---

## Architecture Notes

### Media Parser System (`/src/lib/mediaParser.ts`)

The media parser is responsible for detecting and categorizing media URLs from Nostr events.

**Key Components**:

1. **`parseMediaFromEvent(event)`** - Main entry point
   - Processes `imeta` tags first (NIP-94 file metadata)
   - Detects media type from mime type or file extension
   - Extracts all imeta URLs to prevent duplicates
   - Calls `parseMediaFromContent()` with skip list
   - Returns combined array of media items

2. **`parseMediaFromContent(content, skipUrls)`** - Content parsing
   - Uses regex patterns to detect various media types
   - Processes in priority order (YouTube → videos → images → links)
   - Skips URLs already found in imeta tags
   - Handles 30+ different media platforms and formats

3. **Media Type Detection Order**:
   - Direct video files (.mp4, .webm, etc.)
   - Direct image files (.jpg, .png, etc.)
   - Direct audio files (.mp3, .wav, etc.)
   - Video platforms (YouTube, Vimeo, etc.)
   - Image hosting services (imgur, nostr.build, etc.)
   - Generic CDN URLs
   - Website links (fallback)

**Important**: Always check imeta tags BEFORE parsing content to avoid duplicates!

### NIP-94 File Metadata (`imeta` tags)

Format: `["imeta", "url <URL>", "m <mime>", "blurhash <hash>", "dim <WxH>", "alt <text>"]`

Common issue: Not all clients include the `m` (mime type) field, so we must fall back to file extension detection.

---

## Development Guidelines

### When Adding New Media Type Support

1. Add regex pattern to `mediaPatterns` object
2. Add type to `MediaItem['type']` union
3. Add case to `createMediaItem()` function
4. Add rendering case to `MediaDisplay.tsx`
5. Test with both imeta tags and direct URLs
6. Ensure no duplicate rendering

### Media Parsing Priority

Remember: **Specificity before generality**
- Check specific patterns first (YouTube, video files)
- Check generic patterns last (imageHosting, website)
- Always exclude already-processed URLs

### Git Commit Messages

Format: `<type>: <short description>`

Types:
- `Fix` - Bug fixes
- `Add` - New features
- `Update` - Improvements to existing features
- `Refactor` - Code restructuring without behavior change
- `Docs` - Documentation updates

Include detailed explanation of:
- What was the problem?
- What was the root cause?
- What changed?
- What's the result?

---

## Known Issues

### None currently tracked

---

## Future Improvements

### Media Parser

- [ ] Add caching for Open Graph data
- [ ] Support for more video platforms (Kick, Theta.tv, etc.)
- [ ] Better thumbnail generation for videos
- [ ] Support for image galleries from single events

### Performance

- [ ] Lazy loading for media in long feeds
- [ ] Virtual scrolling for large event lists
- [ ] Image compression/optimization

---

## Testing Notes

### Manual Testing Checklist for Media

When testing media parsing changes:

- [ ] Test with imeta tags (both with and without mime types)
- [ ] Test with URLs in content only
- [ ] Test with both imeta AND content URLs (check for duplicates)
- [ ] Test different file extensions (.mp4, .webm, .jpg, .png)
- [ ] Test different hosting services (nostr.build, blossom, void.cat)
- [ ] Test video platforms (YouTube, Vimeo, etc.)
- [ ] Check console for parsing logs

### Example Test Events

**Note with video in imeta**: `note1xulk3v5szke8a580sxjt89zc72gp225xndtvkvzpxf5dsvl52cjqwgyge8`
- Contains video from video.nostr.build
- Has imeta tag without mime type
- Good test for file extension fallback

---

*Last updated: 2025-01-06*
