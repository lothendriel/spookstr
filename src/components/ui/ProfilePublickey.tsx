import { useState } from 'react';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { CopyIcon } from 'lucide-react';

export function ProfilePublickey({ pubkey }: { pubkey: string }) {
  const [copied, setCopied] = useState(false);

  // Convert hex pubkey to npub format
  const npub = nip19.npubEncode(pubkey);

  const handleCopy = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(npub);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = npub;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="flex items-center">
      <span className="text-sm font-mono max-w-64 truncate mr-2">{npub}</span>
      <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy public key">
        <CopyIcon className="w-4 h-4" />
      </Button>
      {copied && <span className="ml-2 text-sm text-green-500">Copied!</span>}
    </div>
  );
}