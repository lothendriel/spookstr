import { memo } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { ParanormalPost } from './ParanormalPost';

interface FeedContentProps {
  posts: NostrEvent[];
  postsToShow: number;
  onPostClick: (post: NostrEvent) => void;
}

/**
 * Memoized feed content component to prevent unnecessary re-renders.
 * Extracts feed rendering logic from the main Index component for better performance.
 */
export const FeedContent = memo(({ posts, postsToShow, onPostClick }: FeedContentProps) => {
  console.log('[FeedContent] Rendering', postsToShow, 'posts out of', posts?.length || 0);

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <>
      {posts.slice(0, postsToShow).map((post) => (
        <ParanormalPost
          key={post.id}
          event={post}
          onClick={() => onPostClick(post)}
          showActions={true}
        />
      ))}
    </>
  );
});

FeedContent.displayName = 'FeedContent';