import { nip19 } from 'nostr-tools';

/**
 * Validate a Nostr event ID or NIP-19 identifier
 * Returns information about the validation result
 */
export interface ValidationResult {
  isValid: boolean;
  type: 'hex' | 'note' | 'nevent' | 'naddr' | 'unknown';
  error?: string;
  decoded?: any;
}

export function validateEventId(eventId: string): ValidationResult {
  if (!eventId || typeof eventId !== 'string') {
    return {
      isValid: false,
      type: 'unknown',
      error: 'Event ID is required and must be a string'
    };
  }

  // Check for hex ID (64 characters, hex only)
  if (eventId.match(/^[0-9a-fA-F]{64}$/)) {
    return {
      isValid: true,
      type: 'hex'
    };
  }

  // Try to decode as NIP-19 identifier
  try {
    const decoded = nip19.decode(eventId);
    
    switch (decoded.type) {
      case 'note':
        if (!decoded.data || typeof decoded.data !== 'string' || !decoded.data.match(/^[0-9a-fA-F]{64}$/)) {
          return {
            isValid: false,
            type: 'note',
            error: 'Invalid note ID format'
          };
        }
        return {
          isValid: true,
          type: 'note',
          decoded: decoded.data
        };

      case 'nevent':
        const neventData = decoded.data as { id: string; author?: string; relays?: string[] };
        if (!neventData.id || !neventData.id.match(/^[0-9a-fA-F]{64}$/)) {
          return {
            isValid: false,
            type: 'nevent',
            error: 'Invalid nevent ID format'
          };
        }
        return {
          isValid: true,
          type: 'nevent',
          decoded: neventData
        };

      case 'naddr':
        const naddrData = decoded.data as { identifier: string; pubkey: string; kind: number; relays?: string[] };
        if (!naddrData.identifier || !naddrData.pubkey || !naddrData.kind) {
          return {
            isValid: false,
            type: 'naddr',
            error: 'Invalid naddr format - missing required fields'
          };
        }
        if (!naddrData.pubkey.match(/^[0-9a-fA-F]{64}$/)) {
          return {
            isValid: false,
            type: 'naddr',
            error: 'Invalid pubkey in naddr'
          };
        }
        return {
          isValid: true,
          type: 'naddr',
          decoded: naddrData
        };

      default:
        return {
          isValid: false,
          type: 'unknown',
          error: `Unsupported NIP-19 type: ${decoded.type}`
        };
    }
  } catch (error) {
    return {
      isValid: false,
      type: 'unknown',
      error: `Failed to decode NIP-19 identifier: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if an event ID might be malformed or suspicious
 * This helps identify common issues with event IDs
 */
export function validateEventIdSuspicion(eventId: string): {
  isSuspicious: boolean;
  reasons: string[];
  suggestions: string[];
} {
  const reasons: string[] = [];
  const suggestions: string[] = [];

  // Check for common issues
  if (eventId.length < 10) {
    reasons.push('Event ID is too short');
    suggestions.push('Event IDs should be at least 10 characters long');
  }

  if (eventId.length > 1000) {
    reasons.push('Event ID is unusually long');
    suggestions.push('Check if the ID was copied correctly');
  }

  // Check for suspicious characters
  if (eventId.includes(' ') || eventId.includes('\n') || eventId.includes('\t')) {
    reasons.push('Event ID contains whitespace');
    suggestions.push('Remove any spaces or line breaks from the ID');
  }

  // Check for common copy-paste issues
  if (eventId.includes('...') || eventId.includes('…')) {
    reasons.push('Event ID contains ellipsis');
    suggestions.push('Ensure the full ID was copied without truncation');
  }

  if (eventId.includes('nostr:') && eventId.length > 63) {
    reasons.push('Event ID includes "nostr:" prefix');
    suggestions.push('The "nostr:" prefix should be removed before the identifier');
  }

  // Check if it looks like a URL
  if (eventId.startsWith('http://') || eventId.startsWith('https://')) {
    reasons.push('Event ID looks like a URL');
    suggestions.push('This appears to be a URL, not an event ID');
  }

  // Check for hex-like but incorrect length
  if (eventId.match(/^[0-9a-fA-F]+$/) && eventId.length !== 64) {
    reasons.push(`Hex ID has incorrect length (${eventId.length} chars, should be 64)`);
    suggestions.push('Ensure the full 64-character hex ID was copied');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    suggestions
  };
}

/**
 * Get a human-readable description of an event ID type
 */
export function getEventIdDescription(validation: ValidationResult): string {
  if (!validation.isValid) {
    return `Invalid event ID: ${validation.error || 'Unknown error'}`;
  }

  switch (validation.type) {
    case 'hex':
      return 'Hex event ID (64-character hexadecimal string)';
    case 'note':
      return 'NIP-19 note identifier (bech32-encoded event ID)';
    case 'nevent':
      return 'NIP-19 nevent identifier (event ID with optional relay hints)';
    case 'naddr':
      return 'NIP-19 naddr identifier (addressable event coordinate)';
    default:
      return 'Unknown event ID format';
  }
}