import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Zap } from 'lucide-react';

export function DeveloperTip() {
  const handleZap = () => {
    // Create a lightning payment URL
    const lightningUrl = `lightning:studio314@getalby.com`;
    window.open(lightningUrl, '_blank');
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText('studio314@getalby.com');
      // You could add a toast notification here
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
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
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
            <h3 className="text-lg font-semibold text-lime-400">Support the Developer</h3>
          </div>

          <p className="text-sm text-lime-100/80">
            Enjoying Spookstr? Help keep the paranormal portal open with a lightning tip!
          </p>

          <div className="flex justify-center space-x-3">
            <Button
              onClick={handleZap}
              className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
            >
              <Zap className="h-4 w-4 mr-2" />
              Zap Developer
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyAddress}
              className="border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300"
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