import { nip19 } from 'nostr-tools';

const hexId = 'be11e9bbf4187024bc3c5ee02c6926fd965081a7a57e382a1f81201e40c1f019';
const note1Id = nip19.noteEncode(hexId);
console.log(note1Id);