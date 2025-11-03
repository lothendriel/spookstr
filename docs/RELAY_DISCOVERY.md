# Advanced Relay Discovery System

This document describes Spookstr's advanced relay discovery system that dynamically finds relevant relays to improve content visibility and discovery across the Nostr network.

## Overview

The relay discovery system implements a comprehensive approach to finding and connecting to relays that are most relevant to the user's network and activity patterns. It goes beyond static relay configurations to provide dynamic, context-aware relay selection.

## Architecture

### Core Components

1. **`useRelayDiscovery`** - Main discovery hook that orchestrates the entire discovery process
2. **`useContextualRelayDiscovery`** - Context-aware discovery for different app sections (feeds, notifications, etc.)
3. **`RelayDiscoveryPanel`** - UI component for managing discovered relays
4. **`RelayDiscoveryIndicator`** - Visual feedback for discovery status
5. **Enhanced `relayHintCache`** - Intelligent caching of relay hints from events

### Discovery Pipeline

The discovery process follows a systematic approach:

#### 1. Network Analysis (25% progress)
- **NIP-02 Contacts**: Analyzes the user's follow list to understand their social network
- **NIP-65 Outbox Model**: Fetches contacts' relay preferences to find popular relays
- **Mutual Contact Scoring**: Prioritizes relays used by multiple contacts

#### 2. Event Analysis (25% progress) 
- **Recent Notes Scanning**: Examines recent notes (kind 1, 6, 16) for relay hints
- **Relay Hint Extraction**: Pulls relay URLs from 'e', 'p', 'a', and 'r' tags
- **Temporal Scoring**: Gives higher scores to recently mentioned relays

#### 3. Connectivity Testing (25% progress)
- **Reachability Tests**: Attempts connections to discovered relays
- **Latency Measurement**: Tests response times for performance ranking
- **Error Handling**: Gracefully handles unreachable relays

#### 4. Ranking & Filtering (25% progress)
- **Multi-factor Scoring**: Combines contact usage, recency, and connectivity
- **Relevance Filtering**: Excludes relays already in user's configuration
- **Performance Ranking**: Prioritizes fast, reliable relays

## Contextual Discovery

The system applies discovery contextually across different app sections:

### Feed Discovery (`useFeedDiscovery`)
- **Purpose**: Enhance main feed content visibility
- **Method**: Analyzes recent feed activity for relay hints
- **Max Relays**: 5 (balanced performance)
- **Cache Time**: 30 seconds (frequently changing content)

### Post Detail Discovery (`usePostDetailDiscovery`)
- **Purpose**: Find replies, interactions, and quoted content
- **Method**: Uses event-specific relay hints and interaction patterns
- **Max Relays**: 8 (comprehensive content discovery)
- **Cache Time**: 90 seconds (more stable content)

### Profile Discovery (`useProfileDiscovery`)
- **Purpose**: Discover user's content across their relay network
- **Method**: Combines NIP-65 outbox model with cached hints
- **Max Relays**: 7 (thorough user content discovery)
- **Cache Time**: 2 minutes (stable profile content)

### Notification Discovery (`useNotificationDiscovery`)
- **Purpose**: Find mentions, replies, and interactions
- **Method**: Analyzes user's posting history and interaction patterns
- **Max Relays**: 6 (important for finding mentions)
- **Cache Time**: 1 minute (important but not frequently changing)

### Interaction Discovery (`useInteractionDiscovery`)
- **Purpose**: Find likes, reposts, zaps, and replies
- **Method**: Event-specific relay hints and interaction tracking
- **Max Relays**: 6 (comprehensive interaction discovery)
- **Cache Time**: 45 seconds (regularly updating)

## Visual Feedback System

### Discovery Indicators

The system provides real-time visual feedback through several indicator variants:

#### Badge Variant
- **Usage**: General purpose, space-efficient
- **Shows**: Context icon, status text, hint count
- **Best for**: Headers, feed items, navigation

#### Detailed Variant  
- **Usage**: Comprehensive status display
- **Shows**: Full stats, progress bars, recommendations
- **Best for**: Settings pages, discovery panels

#### Minimal Variant
- **Usage**: Subtle indication in tight spaces
- **Shows**: Simple icon with tooltip
- **Best for**: Post metadata, inline indicators

### Smart Variant Selection

The `SmartRelayDiscoveryIndicator` automatically chooses the best variant based on:
- **Context**: Different sections prefer different detail levels
- **Content Volume**: High activity contexts use detailed variants
- **Available Space**: Adapts to layout constraints

## Discovery Sources

### NIP-65 Outbox Model
- **Description**: Uses contacts' published relay lists
- **Scoring**: 10 points per contact using the relay
- **Reliability**: High (official user preference)
- **Coverage**: Network-based discovery

### Event Hints
- **Description**: Relay URLs found in event tags
- **Scoring**: 2 points per occurrence  
- **Reliability**: Medium (contextual hints)
- **Coverage**: Content-based discovery

### NIP-02 Contacts
- **Description**: Relay preferences from contact lists
- **Scoring**: Variable based on contact relationship
- **Reliability**: Medium (social network based)
- **Coverage**: Relationship-based discovery

### Recent Notes
- **Description**: Relay hints from recent network activity
- **Scoring**: Temporal decay applied
- **Reliability**: Medium (activity-based)
- **Coverage**: Time-sensitive discovery

## Performance Optimizations

### Intelligent Caching
- **Relay Hint Cache**: Stores discovered hints with LRU eviction
- **Query Result Caching**: Caches discovery results per context
- **Connectivity Cache**: Remembers reachability status temporarily

### Rate Limiting
- **Max Relays per Context**: Prevents query explosion
- **Connectivity Testing**: Limited to top candidates only
- **Background Discovery**: Non-blocking discovery process

### Memory Management
- **Cache Size Limits**: Maximum 1000 entries per cache type
- **Automatic Cleanup**: Periodic removal of stale entries
- **Memory Monitoring**: Tracks cache size and growth

## User Experience

### Automatic Discovery
- **Trigger**: Starts automatically when user logs in
- **Background**: Runs without blocking UI interactions
- **Progressive**: Shows results as they become available

### Manual Control
- **Discovery Panel**: Full control over discovery process
- **Selective Addition**: Choose which relays to add permanently
- **Temporary Connections**: Preview content before committing

### Privacy Considerations
- **Local Processing**: Discovery runs entirely in browser
- **No Central Server**: No data sent to Spookstr servers
- **User Control**: Full control over which relays to add

## Configuration

### Discovery Settings

Users can control discovery through several mechanisms:

#### Relay Settings Page
- **Smart Discovery Tab**: Full discovery interface
- **Automatic Discovery**: Enable/disable auto-discovery
- **Discovery Sources**: Configure which sources to use

#### Context-Specific Controls
- **Per-Context Enabling**: Enable discovery for specific contexts
- **Max Relay Limits**: Adjust relay count per context
- **Cache Management**: Clear caches when needed

### Advanced Configuration

#### Developer Options
- **Discovery Logging**: Detailed console output for debugging
- **Cache Inspection**: View cache contents and statistics
- **Performance Metrics**: Monitor discovery performance

## Integration with Existing Systems

### Relay Management
- **Existing Relays**: Discovery respects current relay configuration
- **No Overwrites**: Never replaces user's chosen relays
- **Additive Approach**: Only suggests additional relays

### Nostr Protocol Compliance
- **NIP-65 Support**: Full inbox/outbox model implementation
- **NIP-02 Integration**: Uses contact lists for discovery
- **Event Tag Parsing**: Proper handling of relay hints

### Performance Integration
- **Query Optimization**: Works with existing query caching
- **Background Processing**: Doesn't block critical operations  
- **Resource Management**: Respects browser resource limits

## Troubleshooting

### Common Issues

#### No Relays Discovered
- **Cause**: Limited social network or activity
- **Solution**: Follow more users, post more content
- **Workaround**: Add relays manually from preset list

#### Discovery Too Slow
- **Cause**: Network connectivity or relay responsiveness
- **Solution**: Check internet connection, try different relays
- **Workaround**: Disable connectivity testing

#### Too Many Relays Suggested
- **Cause**: Very active social network
- **Solution**: Adjust max relay limits in settings
- **Workaround**: Use selective addition instead of bulk add

### Debug Information

#### Console Logging
```javascript
// Enable detailed discovery logging
localStorage.setItem('spookstr-debug-discovery', 'true');
```

#### Cache Inspection
```javascript
// View cache statistics
console.log('Relay hint cache size:', relayHintCache.getCacheSize());
```

#### Performance Monitoring
```javascript
// Monitor discovery performance
performance.mark('discovery-start');
// ... discovery process ...
performance.mark('discovery-end');
performance.measure('discovery-time', 'discovery-start', 'discovery-end');
```

## Future Enhancements

### Planned Features
- **Machine Learning**: Pattern recognition for better recommendations
- **Geographic Optimization**: Location-based relay suggestions
- **Performance Analytics**: Detailed relay performance tracking
- **Social Scoring**: Enhanced social network analysis

### Potential Improvements
- **Collaborative Filtering**: Learn from similar users' preferences
- **Predictive Discovery**: Anticipate relay needs based on activity
- **Quality Metrics**: Advanced relay quality assessment
- **Integration APIs**: Third-party relay recommendation services

## Security Considerations

### Privacy Protection
- **Local Processing**: All discovery happens client-side
- **No Tracking**: No user behavior tracking or logging
- **Data Minimization**: Only processes necessary relay information

### Security Measures
- **URL Validation**: Strict validation of discovered relay URLs
- **Connection Security**: Only secure WebSocket connections (wss://)
- **Rate Limiting**: Prevents discovery from overwhelming relays

### Trust Model
- **User Control**: Users have final say on relay additions
- **Transparency**: Clear indication of discovery sources
- **Reversibility**: Easy to remove discovered relays

---

This relay discovery system represents a significant advancement in Nostr client capabilities, providing users with intelligent, context-aware relay discovery that improves content visibility while maintaining user control and privacy.