import { describe, it, expect } from 'vitest';
import { genUserName } from './genUserName';

describe('genUserName', () => {
  it('generates a deterministic name from a seed', () => {
    const seed = 'test-seed-123';
    const name1 = genUserName(seed);
    const name2 = genUserName(seed);

    expect(name1).toEqual('Brave Whale');
    expect(name1).toEqual(name2);
  });

  it('generates different names for different seeds', () => {
    const name1 = genUserName('seed1');
    const name2 = genUserName('seed2');
    const name3 = genUserName('seed3');

    // While it's theoretically possible for different seeds to generate the same name,
    // it's very unlikely with our word lists
    expect(name1).not.toBe(name2);
    expect(name2).not.toBe(name3);
    expect(name1).not.toBe(name3);
  });

  it('handles typical Nostr pubkey format', () => {
    // Typical hex pubkey (64 characters)
    const pubkey = 'e4690a13290739da123aa17d553851dec4cdd0e9d89aa18de3741c446caf8761';
    const name = genUserName(pubkey);

    expect(name).toEqual('Gentle Hawk');
  });

  it('handles edge cases gracefully', () => {
    // Empty string
    expect(genUserName('')).toEqual('Anonymous User');

    // Null/undefined
    expect(genUserName(null as any)).toEqual('Anonymous User');
    expect(genUserName(undefined as any)).toEqual('Anonymous User');

    // Non-string input
    expect(genUserName(123 as any)).toEqual('Anonymous User');

    // Very short string
    expect(genUserName('a')).toBeTypeOf('string');

    // Special characters
    expect(genUserName('test@#$%^&*()')).toBeTypeOf('string');
  });

  it('generates valid name format', () => {
    const pubkey = 'test-pubkey-1234567890123456789012345678901234567890123';
    const name = genUserName(pubkey);

    // Should be in format "Adjective Noun"
    const parts = name.split(' ');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[A-Z][a-z]+$/);
    expect(parts[1]).toMatch(/^[A-Z][a-z]+$/);
  });

  it('is case-sensitive', () => {
    const name1 = genUserName('TestSeed');
    const name2 = genUserName('testseed'); // lowercase

    // Should generate different names due to case sensitivity in hash
    expect(name1).not.toBe(name2);
  });

  it('handles unicode characters', () => {
    const unicodeSeed = 'tëst-sëéd-üñïcödé';
    const name = genUserName(unicodeSeed);

    // Should still generate a valid name without crashing
    expect(name).toBeTypeOf('string');
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
});