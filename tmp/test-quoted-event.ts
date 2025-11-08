// Test script to debug quoted event handling
import { nip19 } from 'nostr-tools';

// The hex ID from the q tag
const hexId = 'be11e9bbf4187024bc3c5ee02c6926fd965081a7a57e382a1f81201e40c1f019';

// Convert to note1
const note1Id = nip19.noteEncode(hexId);
console.log('Hex ID:', hexId);
console.log('Note1 ID:', note1Id);

// Test decoding
const decoded = nip19.decode(note1Id);
console.log('Decoded type:', decoded.type);
console.log('Decoded data:', decoded.data);

// Test if hex ID matches expected pattern
const isHex = /^[0-9a-fA-F]{64}$/.test(hexId);
console.log('Is valid hex ID:', isHex);
console.log('Hex ID length:', hexId.length);