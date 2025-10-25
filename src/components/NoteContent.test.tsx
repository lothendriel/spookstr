import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { NoteContent } from './NoteContent';
import { containsProhibitedHashtags, getProhibitedHashtags, shouldBlockPost, sanitizeContent } from '@/lib/contentFilter';
import type { NostrEvent } from '@nostrify/nostrify';

describe('ContentFilter', () => {
  it('detects prohibited hashtags in content', () => {
    const content = 'Check out this #loli content #agegap';
    expect(containsProhibitedHashtags(content)).toBe(true);
  });

  it('does not detect prohibited hashtags in clean content', () => {
    const content = 'Check out this #art content #photography';
    expect(containsProhibitedHashtags(content)).toBe(false);
  });

  it('returns list of prohibited hashtags found', () => {
    const content = 'This contains #loli and #incest hashtags';
    const hashtags = getProhibitedHashtags(content);
    expect(hashtags).toContain('#loli');
    expect(hashtags).toContain('#incest');
    expect(hashtags).toHaveLength(2);
  });

  it('returns empty list for clean content', () => {
    const content = 'This contains #art and #photography hashtags';
    const hashtags = getProhibitedHashtags(content);
    expect(hashtags).toHaveLength(0);
  });

  it('correctly identifies posts that should be blocked', () => {
    const content = 'Some #loli content here';
    const result = shouldBlockPost(content);
    expect(result.shouldBlock).toBe(true);
    expect(result.reason).toContain('#loli');
  });

  it('correctly identifies posts that should not be blocked', () => {
    const content = 'Some #art content here';
    const result = shouldBlockPost(content);
    expect(result.shouldBlock).toBe(false);
    expect(result.reason).toBe('');
  });

  it('sanitizes content by removing prohibited hashtags', () => {
    const content = 'Check out this #loli content #agegap and #art';
    const sanitized = sanitizeContent(content);
    expect(sanitized).toBe('Check out this content and #art');
    expect(sanitized).not.toContain('#loli');
    expect(sanitized).not.toContain('#agegap');
  });

  it('handles case insensitive hashtag detection', () => {
    const content = 'Check out this #LOLI content #AgeGap';
    expect(containsProhibitedHashtags(content)).toBe(true);
    expect(getProhibitedHashtags(content)).toContain('#LOLI');
    expect(getProhibitedHashtags(content)).toContain('#AgeGap');
  });

  it('detects multiple prohibited hashtags', () => {
    const content = '#loli #incest #lolicon #cuntboy #agegap #underage #Lolified #lolifiedselfportrait #loli #agedifference';
    expect(containsProhibitedHashtags(content)).toBe(true);
    const hashtags = getProhibitedHashtags(content);
    expect(hashtags.length).toBeGreaterThan(0);
  });
});

describe('NoteContent with Content Filtering', () => {
  it('blocks posts containing prohibited hashtags', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Check out this #loli content #agegap',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should show blocked message instead of content
    expect(screen.getByText('This post has been hidden due to prohibited content.')).toBeInTheDocument();
    
    // Should not show the original content
    expect(screen.queryByText('Check out this #loli content #agegap')).not.toBeInTheDocument();
  });

  it('allows posts without prohibited hashtags', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Check out this #art content #photography',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should show the original content
    expect(screen.getByText('Check out this #art content #photography')).toBeInTheDocument();
    
    // Should not show blocked message
    expect(screen.queryByText('This post has been hidden due to prohibited content.')).not.toBeInTheDocument();
  });

  it('blocks posts with mixed prohibited and allowed hashtags', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Great #art but also some #loli content here',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should block the entire post
    expect(screen.getByText('This post has been hidden due to prohibited content.')).toBeInTheDocument();
    
    // Should not show any of the content
    expect(screen.queryByText('Great #art but also some')).not.toBeInTheDocument();
  });

  it('handles case insensitive prohibited hashtags', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Check out this #LOLI content #AgeGap',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should block even with uppercase hashtags
    expect(screen.getByText('This post has been hidden due to prohibited content.')).toBeInTheDocument();
  });

  it('blocks posts with specific prohibited hashtag #cuntboy', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Some content with #cuntboy hashtag',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    expect(screen.getByText('This post has been hidden due to prohibited content.')).toBeInTheDocument();
  });

  it('blocks posts with specific prohibited hashtag #underage', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Some content with #underage hashtag',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    expect(screen.getByText('This post has been hidden due to prohibited content.')).toBeInTheDocument();
  });

  it('blocks posts with specific prohibited hashtag #Lolified', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Some content with #Lolified hashtag',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    expect(screen.getByText('This post has been hidden due to prohibited content.')).toBeInTheDocument();
  });

  it('allows normal posts with links and media', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Check out this image: https://example.com/image.jpg and this #art hashtag',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should show the content
    expect(screen.getByText('Check out this image:')).toBeInTheDocument();
    expect(screen.getByText('and this #art hashtag')).toBeInTheDocument();
    
    // Should not show blocked message
    expect(screen.queryByText('This post has been hidden due to prohibited content.')).not.toBeInTheDocument();
  });
});