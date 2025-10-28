import { useSpookstrProfileSync } from '@/hooks/useSpookstrProfileSync';

/**
 * Component that automatically syncs user profiles to the Spookstr relay.
 * Should be rendered once at the app level.
 */
export function SpookstrProfileSync() {
  useSpookstrProfileSync();
  return null;
}
