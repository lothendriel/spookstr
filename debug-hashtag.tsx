import { processTextContent, NoteContent } from './src/components/NoteContent';
import { render } from '@testing-library/react';
import { TestApp } from './src/test/TestApp';

// Simple test to debug hashtag functionality
const testText = 'This is a post about #nostr and #bitcoin development. Also check https://example.com and nostr:npub1test';

console.log('Testing text:', testText);

// Test the regex directly
const regex = /(https?:\/\/[^\s]+)|(nostr:(npub1|note1|nprofile1|nevent1)[023456789acdefghjklmnpqrstuvwxyz]+)|(#\w+)/g;

let match;
const matches = [];
while ((match = regex.exec(testText)) !== null) {
  matches.push({
    fullMatch: match[0],
    url: match[1],
    nostrRef: match[2],
    nostrPrefix: match[3],
    hashtag: match[4],
    index: match.index
  });
}

console.log('Regex matches:', matches);

// Test the processTextContent function
const parts = processTextContent(testText);
console.log('Processed parts:', parts);

// Create a simple event to test
const testEvent = {
  id: 'test-id',
  pubkey: 'test-pubkey',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: testText,
  sig: 'test-sig',
};

// Try to render it
const { container } = render(
  <TestApp>
    <NoteContent event={testEvent} />
  </TestApp>
);

console.log('Rendered HTML:', container.innerHTML);