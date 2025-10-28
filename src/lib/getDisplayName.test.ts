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
});
