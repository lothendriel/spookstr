// Test the hashtag regex
const testText = 'This is a post about #nostr and #bitcoin development. Also check https://example.com and nostr:npub1test';

console.log('Testing text:', testText);

// Test the current regex
const regex = /(https?:\/\/[^\s]+)|(nostr:(npub1|note1|nprofile1|nevent1)[023456789acdefghjklmnpqrstuvwxyz]+)|(#\w+)/g;

let match;
const matches = [];
while ((match = regex.exec(testText)) !== null) {
  console.log('Full match:', match[0]);
  console.log('Groups:', match.slice(1));
  console.log('Match object:', match);
  console.log('---');
  
  matches.push({
    fullMatch: match[0],
    url: match[1],
    nostrRef: match[2],
    nostrPrefix: match[3],
    hashtag: match[4],
    index: match.index
  });
}

console.log('All matches:', matches);

// Test a simpler regex just for hashtags
const hashtagRegex = /(#\w+)/g;
const hashtagMatches = [];
let hashtagMatch;
while ((hashtagMatch = hashtagRegex.exec(testText)) !== null) {
  hashtagMatches.push({
    fullMatch: hashtagMatch[0],
    hashtag: hashtagMatch[1],
    index: hashtagMatch.index
  });
}

console.log('Hashtag matches only:', hashtagMatches);