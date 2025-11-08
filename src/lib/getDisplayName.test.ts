import { describe, it, expect } from 'vitest';
import { getDisplayName } from './getDisplayName';
import type { NostrMetadata } from '@nostrify/nostrify';

describe('getDisplayName', () => {
  const testPubkey = 'e4690a13290739da123aa17d553851dec4cdd0e9d89aa18de3741c446caf8761';

  it('prioritizes display_name over name', () => {
    const metadata: NostrMetadata = {
      display_name: 'Alice Johnson',
      name: 'alice',
    };

    expect(getDisplayName(metadata, testPubkey)).toBe('Alice Johnson');
  });

  it('uses name when display_name is not available', () => {
    const metadata: NostrMetadata = {
      name: 'alice',
    };

    expect(getDisplayName(metadata, testPubkey)).toBe('alice');
  });

  it('generates fallback name when both display_name and name are undefined', () => {
    const metadata: NostrMetadata = {};

    const result = getDisplayName(metadata, testPubkey);
    expect(result).toBe('Gentle Hawk');
  });

  it('generates fallback name when metadata is undefined', () => {
    const result = getDisplayName(undefined, testPubkey);
    expect(result).toBe('Gentle Hawk');
  });

  it('uses display_name even when it contains special characters', () => {
    const metadata: NostrMetadata = {
      display_name: 'Alice 🎃 Johnson',
      name: 'alice',
    };

    expect(getDisplayName(metadata, testPubkey)).toBe('Alice 🎃 Johnson');
  });

  it('uses name when display_name is an empty string', () => {
    const metadata: NostrMetadata = {
      display_name: '',
      name: 'alice',
    };

    expect(getDisplayName(metadata, testPubkey)).toBe('alice');
  });

  it('generates fallback when both are empty strings', () => {
    const metadata: NostrMetadata = {
      display_name: '',
      name: '',
    };

    const result = getDisplayName(metadata, testPubkey);
    expect(result).toBe('Gentle Hawk');
  });

  it('handles invalid pubkey inputs gracefully', () => {
    const metadata: NostrMetadata = {
      name: 'Test User',
    };

    // Empty string pubkey
    let result = getDisplayName(metadata, '');
    expect(result).toBe('Unknown User');

    // Null pubkey
    result = getDisplayName(metadata, null as any);
    expect(result).toBe('Unknown User');

    // Undefined pubkey
    result = getDisplayName(metadata, undefined as any);
    expect(result).toBe('Unknown User');

    // Non-string pubkey
    result = getDisplayName(metadata, 123 as any);
    expect(result).toBe('Unknown User');
  });

  it('handles null/undefined metadata gracefully', () => {
    // Null metadata
    let result = getDisplayName(null, testPubkey);
    expect(result).toBe('Gentle Hawk');

    // Undefined metadata
    result = getDisplayName(undefined, testPubkey);
    expect(result).toBe('Gentle Hawk');

    // Empty metadata
    result = getDisplayName({}, testPubkey);
    expect(result).toBe('Gentle Hawk');
  });

  it('generates consistent fallback names', () => {
    const metadata: NostrMetadata = {};
    const pubkey = 'test-pubkey-12345678901234567890123456789012345678901234';

    const result1 = getDisplayName(metadata, pubkey);
    const result2 = getDisplayName(metadata, pubkey);

    expect(result1).toBe(result2);
    expect(result1).toBe('Noble Wolf');
  });

  it('generates different fallback names for different pubkeys', () => {
    const metadata: NostrMetadata = {};
    const pubkey1 = 'test-pubkey-12345678901234567890123456789012345678901234';
    const pubkey2 = 'different-pubkey-1234567890123456789012345678901234567890123';

    const result1 = getDisplayName(metadata, pubkey1);
    const result2 = getDisplayName(metadata, pubkey2);

    expect(result1).not.toBe(result2);
  });

  it('handles metadata with whitespace only names', () => {
    const metadata: NostrMetadata = {
      name: '   ',
      display_name: '   ',
    };

    const result = getDisplayName(metadata, testPubkey);
    expect(result).toBe('Noble Wolf');
  });

  it('prioritizes non-empty values', () => {
    const metadata: NostrMetadata = {
      name: 'alice',
      display_name: '', // Empty
    };

    const result = getDisplayName(metadata, testPubkey);
    expect(result).toBe('alice');
  });
});
