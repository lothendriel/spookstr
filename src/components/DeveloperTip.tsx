import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZapDialog } from '@/components/ZapDialog';
import { Coffee, Zap } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

// Create a mock event for developer profile that ZapDialog can understand
const DEVELOPER_MOCK_EVENT = {
  id: 'developer-tip',
  pubkey: '0155373ac79b7ffb0f586c3e68396f9e82d46f7afe7016d46ed9ca46ba3e1bed',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1, // Use kind 1 (text note) so ZapDialog doesn't try to parse metadata
  tags: [],
  content: 'Support Spookstr development - send a zap to the developer!',
  sig: ''
} as const;

export function DeveloperTip() {
  const { toast } = useToast();

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText('studio314@getalby.com');
      toast({
        title: 'Address copied!',
        description: 'Lightning address copied to clipboard.',
      });
    } catch (err) {
      console.error('Failed to copy address:', err);
      // Fallback for when clipboard API is blocked
      try {
        const textArea = document.createElement('textarea');
        textArea.value = 'studio314@getalby.com';
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: 'Address copied!',
          description: 'Lightning address copied to clipboard.',
        });
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
        // Final fallback - show alert
        alert('Lightning address: studio314@getalby.com');
      }
    }
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Coffee className="h-5 w-5 text-lime-400" />
            <h3 className="text-lg font-semibold text-lime-400">Support Developer</h3>
          </div>

          <p className="text-sm text-lime-100/80">
            Enjoying Spookstr? Help keep the paranormal portal open with a lightning tip!
          </p>

          <div className="flex flex-col space-y-3">
            <ZapDialog target={DEVELOPER_MOCK_EVENT}>
              <Button className="bg-lime-500 hover:bg-lime-400 text-black font-semibold w-full">
                <Zap className="h-4 w-4 mr-2" />
                Zap Developer
              </Button>
            </ZapDialog>

            <Button
              variant="outline"
              onClick={handleCopyAddress}
              className="border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300 w-full"
            >
              Copy LN Address
            </Button>
          </div>

          <p className="text-xs text-lime-500/60">
            studio314@getalby.com
          </p>
        </div>
      </CardContent>
    </Card>
  );
}