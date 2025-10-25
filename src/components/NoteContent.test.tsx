import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { NoteContent } from './NoteContent';
import type { NostrEvent } from '@nostrify/nostrify';

describe('NoteContent', () => {
  it('linkifies URLs in kind 1 events', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Check out this link: https://example.com',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('linkifies URLs in kind 1111 events (comments)', () => {
    const event: NostrEvent = {
      id: 'test-comment-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1111,
      tags: [
        ['a', '30040:pubkey:identifier'],
        ['k', '30040'],
        ['p', 'pubkey'],
      ],
      content: 'I think the log events should be different kind numbers instead of having a `log-type` tag. That way you can use normal Nostr filters to filter the log types. Also, the `note` type should just b a kind 1111: https://nostrbook.dev/kinds/1111',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    const link = screen.getByRole('link', { name: 'https://nostrbook.dev/kinds/1111' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://nostrbook.dev/kinds/1111');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('handles text without URLs correctly', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1111,
      tags: [],
      content: 'This is just plain text without any links.',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    expect(screen.getByText('This is just plain text without any links.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders hashtags as links', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'This is a post about #nostr and #bitcoin development.',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    const nostrHashtag = screen.getByRole('link', { name: '#nostr' });
    const bitcoinHashtag = screen.getByRole('link', { name: '#bitcoin' });

    expect(nostrHashtag).toBeInTheDocument();
    expect(bitcoinHashtag).toBeInTheDocument();
    expect(nostrHashtag).toHaveAttribute('href', '/t/nostr');
    expect(bitcoinHashtag).toHaveAttribute('href', '/t/bitcoin');
  });

  it('generates deterministic names for users without metadata and styles them differently', () => {
    // Use a valid npub for testing
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: `Mentioning nostr:npub1zg69v7ys40x77y352eufp27daufrg4ncjz4ummcjx3t83y9tehhsqepuh0`,
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // The mention should be rendered with a deterministic name
    const mention = screen.getByRole('link');
    expect(mention).toBeInTheDocument();

    // Should have muted styling for generated names (gray instead of blue)
    expect(mention).toHaveClass('text-gray-500');
    expect(mention).not.toHaveClass('text-blue-500');

    // The text should start with @ and contain a generated name (not a truncated npub)
    const linkText = mention.textContent;
    expect(linkText).not.toMatch(/^@npub1/); // Should not be a truncated npub
    expect(linkText).toEqual("@Swift Falcon");
  });

  it('displays direct image URLs as images', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Check out this image: https://example.com/image.jpg',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display an image element
    const image = screen.getByAltText('Image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');

    // Should also display the text before the image
    expect(screen.getByText('Check out this image:')).toBeInTheDocument();
  });

  it('displays various image formats correctly', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Multiple formats: https://example.com/image.png https://example.com/photo.webp https://example.com/graphic.avif https://example.com/icon.ico',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display all images
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(4);

    expect(images[0]).toHaveAttribute('src', 'https://example.com/image.png');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/photo.webp');
    expect(images[2]).toHaveAttribute('src', 'https://example.com/graphic.avif');
    expect(images[3]).toHaveAttribute('src', 'https://example.com/icon.ico');
  });

  it('displays images from hosting services without extensions', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Imgur image: https://i.imgur.com/abc123 and Twitter image: https://pbs.twimg.com/media/DEF456',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display images from hosting services
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);

    expect(images[0]).toHaveAttribute('src', 'https://i.imgur.com/abc123');
    expect(images[1]).toHaveAttribute('src', 'https://pbs.twimg.com/media/DEF456');
  });

  it('handles case insensitive image extensions', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Mixed case: https://example.com/IMAGE.JPG https://example.com/photo.PNG',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display images regardless of case
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);

    expect(images[0]).toHaveAttribute('src', 'https://example.com/IMAGE.JPG');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/photo.PNG');
  });

  it('displays Bluesky CDN images with @format suffix', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Bluesky image: https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5quuuyr7xndtklizfs2buydm/bafkreiarww5mmusluuepyvhwrvymuglmsmiq6v7begaszqopqlcwonrkze@jpeg',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display the Bluesky image
    const image = screen.getByAltText('Image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5quuuyr7xndtklizfs2buydm/bafkreiarww5mmusluuepyvhwrvymuglmsmiq6v7begaszqopqlcwonrkze@jpeg');

    // Should also display the text before the image
    expect(screen.getByText('Bluesky image:')).toBeInTheDocument();
  });

  it('displays various @format image URLs', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Multiple @format images: https://example.com/image1@jpg https://example.com/image2@png https://example.com/image3@webp',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display all images with @format
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);

    expect(images[0]).toHaveAttribute('src', 'https://example.com/image1@jpg');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/image2@png');
    expect(images[2]).toHaveAttribute('src', 'https://example.com/image3@webp');
  });

  it('does not display duplicate images for URLs that match multiple patterns', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Bluesky image that matches both patterns: https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5quuuyr7xndtklizfs2buydm/bafkreiarww5mmusluuepyvhwrvymuglmsmiq6v7begaszqopqlcwonrkze@jpeg',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display only ONE image, not duplicates
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);

    expect(images[0]).toHaveAttribute('src', 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5quuuyr7xndtklizfs2buydm/bafkreiarww5mmusluuepyvhwrvymuglmsmiq6v7begaszqopqlcwonrkze@jpeg');

    // Should also display the text before the image
    expect(screen.getByText('Bluesky image that matches both patterns:')).toBeInTheDocument();
  });

  it('handles multiple unique images without duplication', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Multiple different images: https://example.com/image.jpg https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5quuuyr7xndtklizfs2buydm/bafkreiarww5mmusluuepyvhwrvymuglmsmiq6v7begaszqopqlcwonrkze@jpeg https://i.imgur.com/abc123',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display exactly 3 unique images, no duplicates
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);

    expect(images[0]).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(images[1]).toHaveAttribute('src', 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5quuuyr7xndtklizfs2buydm/bafkreiarww5mmusluuepyvhwrvymuglmsmiq6v7begaszqopqlcwonrkze@jpeg');
    expect(images[2]).toHaveAttribute('src', 'https://i.imgur.com/abc123');
  });

  it('displays IMDB links as rich preview cards', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Check out this movie: https://www.imdb.com/title/tt0111161/',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display IMDB preview card
    const imdbCard = screen.getByText('IMDb').closest('div');
    expect(imdbCard).toBeInTheDocument();

    // Should contain movie title and metadata
    expect(screen.getByText(/The Shawshank Redemption|The Godfather|The Dark Knight|Pulp Fiction/)).toBeInTheDocument();

    // Should display IMDB branding
    expect(screen.getByText('IMDb')).toBeInTheDocument();

    // Should have external link button
    const externalLinkButton = screen.getByRole('button', { name: /open/i });
    expect(externalLinkButton).toBeInTheDocument();

    // Should also display the text before the link
    expect(screen.getByText('Check out this movie:')).toBeInTheDocument();
  });

  it('displays IMDB person links as preview cards', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Actor profile: https://www.imdb.com/name/nm0000151/',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display IMDB preview card
    const imdbCard = screen.getByText('IMDb').closest('div');
    expect(imdbCard).toBeInTheDocument();

    // Should contain person type badge
    expect(screen.getByText('Person')).toBeInTheDocument();

    // Should have external link button
    const externalLinkButton = screen.getByRole('button', { name: /open/i });
    expect(externalLinkButton).toBeInTheDocument();

    // Should also display the text before the link
    expect(screen.getByText('Actor profile:')).toBeInTheDocument();
  });

  it('handles various IMDB URL formats', () => {
    const event: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'Multiple IMDB links: https://imdb.com/title/tt0111161/ https://www.imdb.com/name/nm0000151/ https://imdb.com/title/tt0068646/',
      sig: 'test-sig',
    };

    render(
      <TestApp>
        <NoteContent event={event} />
      </TestApp>
    );

    // Should display three IMDB preview cards
    const imdbCards = screen.getAllByText('IMDb');
    expect(imdbCards).toHaveLength(3);

    // Should have three external link buttons
    const externalLinkButtons = screen.getAllByRole('button', { name: /open/i });
    expect(externalLinkButtons).toHaveLength(3);
  });
});